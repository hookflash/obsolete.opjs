/*jshint node: true */
'use strict';

var http = require('http');
var urlParse = require('url').parse;
var pathJoin = require('path').join;
var send = require('send');
var WebSocketServer = require('ws').Server;
var Transport = require('./lib/transport');

var server = http.createServer(function (req, res) {
  var pathname = urlParse(req.url).pathname;

  if (pathname.slice(0, 6) === '/opjs/') {
    send(req, pathname.slice(5))
      .root(pathJoin(__dirname, '..', 'lib'))
      .pipe(res);
    return;
  }

  send(req, pathname)
    .root(pathJoin(__dirname, 'public'))
    .pipe(res);
});

var sessions = {};
var transports = {};
var api = {
  'update': function (request) {
    var target = transports[request.to];
    if (!target) {
      throw new Error('Invalid transport ID');
    }
    return target.request('update', request);
  },
  'bye': function (request) {
    var target = transports[request.to];
    if (!target) {
      throw new Error('Invalid transport ID');
    }
    return target.request('bye', request);
  },
  'session-create': function (request, transport) {
    var username = request.username;
    if (!username) {
      throw new Error('Missing username field');
    }

    var session = transport;

    var list = sessions[username];
    if (!list) {
      sessions[username] = [session];
    }
    else {
      list.push(session);
    }

    return {
      server: 'node.js ' + process.version
    };
  },
  'session-delete': function (request) {
    console.error('TODO: Implement session-delete request handler', request);
  },
  'session-keep-alive': function (request) {
    console.error('TODO: Implement session-keep-alive request handler', request);
  },
  'peer-location-find': function (request, transport) {
    request.from = transport.id;
    var username = request.username;
    var list = sessions[username] || [];
    var locations = list.map(function (transport) {
      var socket = transport.socket._socket;
      return {
        localAddress: socket.localAddress,
        localPort: socket.localPort,
        remoteAddress: socket.remoteAddress,
        remotePort: socket.remotePort
      };
    });

    list.forEach(function (transport) {
      transport.peerLocationFind(request).then(function (reply) {
        transport.result(request, reply, true);
      });
    });

    return {
      locations: locations
    };
  }
};


var wsServer = new WebSocketServer({server: server});
wsServer.on('connection', function (socket) {
  var transport = new Transport(api);
  var id;
  do {
    id = (Math.random() * 0x100000000).toString(32);
  } while (id in transports);
  transports[id] = transport;
  transport.id = id;
  transport.open(socket);
  transport.on('closed', function (reason) {
    console.log('socket closed: ' + reason);
    Object.keys(sessions).forEach(function (username) {
      var list = sessions[username];
      var index = list.indexOf(transport);
      if (index >= 0) {
        list.splice(index, 1);
      }
    });
    delete transports[id];
  });
});

var PORT = process.env.PORT || process.getuid() ? 8080 : 80;

server.listen(PORT, function () {
  console.log('Server listening at', server.address());
});

if (!process.getuid()) {
  // If we're running as root, drop down to a regular user after binding to 80
  var stat = require('fs').statSync(__filename);
  process.setgid(stat.gid);
  process.setuid(stat.uid);
}

