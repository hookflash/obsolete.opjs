/*jshint node: true */
'use strict';

var urlParse = require('url').parse;
var pathJoin = require('path').join;
var send = require('send');
var WebSocketServer = require('ws').Server;
var Transport = require('./lib/transport');

function handler(req, res) {
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
}

var sessions = {};
var transports = {};
var api = {
  'update': function (request, transport) {
    var target = transports[request.to];
    if (!target) {
      throw new Error('Invalid transport ID');
    }
    request.from = transport.id;
    return target.request('update', request);
  },
  'bye': function (request, transport) {
    var target = transports[request.to];
    if (!target) {
      throw new Error('Invalid transport ID');
    }
    request.from = transport.id;
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
    var locations = list.map(function (targetTransport) {
      var socket = targetTransport.socket._socket;
      return {
        localAddress: socket.localAddress,
        localPort: socket.localPort,
        remoteAddress: socket.remoteAddress,
        remotePort: socket.remotePort
      };
    });

    list.forEach(function (targetTransport) {
      targetTransport.peerLocationFind(request).then(function (reply) {
        reply.from = targetTransport.id;
        transport.result(request, reply, true);
      });
    });

    return {
      locations: locations
    };
  }
};

function wsHandler(socket) {
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
}

// Start the server(s)
// Run in production mode if the process is root

var https = require('https');
var http = require('http');

var server = http.createServer(handler);
var wsServer = new WebSocketServer({server: server});
wsServer.on('connection', wsHandler);
server.listen(process.getuid() ? 8080 : 80);
console.log('HTTP server listening at', server.address());

// If a certificate file exists, start an https server too
var pfx;
try {
  pfx = require('fs').readFileSync('certificate.pfx');
}
catch (err) {

}
if (pfx) {
  server = https.createServer({
    pfx: pfx,
    honorCipherOrder: true
  }, handler);
  wsServer = new WebSocketServer({server: server});
  wsServer.on('connection', wsHandler);
  server.listen(process.getuid() ? 8443 : 443);
  console.log('HTTPS server listening at', server.address());
}

// drop to normal user after binding to the port
if (!process.getuid()) {
  // If we're running as root, drop down to a regular user after binding to 80
  var stat = require('fs').statSync(__filename);
  console.log('Dropping to normal user', {gid: stat.gid, uid: stat.uid});
  process.setgid(stat.gid);
  process.setuid(stat.uid);
}

