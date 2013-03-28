/*jshint node: true */
'use strict';

var https = require('https');
var http = require('http');
var urlParse = require('url').parse;
var querystring = require('querystring');
var pathJoin = require('path').join;
var send = require('send');
var WebSocketServer = require('ws').Server;
var Transport = require('./lib/transport');
var cookie = require('cookie');
var Q = require('q');


var sessions = {};
var client_id = process.env.CLIENT_ID || '2e8c9abbee702e36c03c';
var client_secret = process.env.CLIENT_SECRET || '112bbb3ebc5a5e156a27afacd108b219938dfe35';

function request(options, query) {
  var deferred = Q.defer();
  deferred.reject = deferred.reject.bind(deferred);

  options.method = options.method || 'POST';
  options.hostname = options.hostname || 'api.github.com';
  options.headers = options.headers || {};

  var headers = options.headers;
  var body;
  if (options.method === 'POST') {
    body = JSON.stringify(query);
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  else if (options.method === 'GET' && query) {
    options.url += '?' + querystring.stringify(query);
  }
  headers.Accept = 'application/json';
  console.log(options);
  var req = https.request(options, function (res) {
    res.on('error', deferred.reject);
    var body = '';
    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end', function () {
      if (res.code >= 400) {
        deferred.reject(new Error(res.code + ': ' + body));
        return;
      }
      var message;
      try {
        message = JSON.parse(body);
      }
      catch (err) {
        deferred.reject(err);
        return;
      }
      if (message.error) {
        return deferred.reject(message.error);
      }
      deferred.resolve(message);
    });
  });
  req.on('error', deferred.reject);
  if (body) {
    req.write(body);
  }
  req.end();
  return deferred.promise;
}


function handler(req, res) {
  var cookies = cookie.parse(req.headers.cookie || '');
  var id = cookies.session_id;
  if (!(id && id in sessions)) {
    do {
      id = (Math.random() * 0x100000000).toString(32);
    } while (id in sessions);
    sessions[id] = {};
  }
  var session = sessions[id];


  res.setHeader('Set-Cookie', [
    cookie.serialize('session_id', id, { path: '/' }),
    cookie.serialize('client_id', client_id, { path: '/' }),
  ]);
  var pathname = urlParse(req.url).pathname;

  if (pathname === '/github') {
    var code = urlParse(req.url, true).query.code;
    return request({
      hostname: 'github.com',
      path: '/login/oauth/access_token'
    }, {
      client_id: client_id,
      client_secret: client_secret,
      code: code
    }).then(function (result) {
      session.access_token = result.access_token;
      session.token_type = result.token_type;
      return request({
        method: 'GET',
        path: '/user',
        headers: {
          'Authorization': 'token ' + session.access_token
        }
      });
    }).then(function (result) {
      session.user = result;
      session.username = result.login + '@github';
      res.setHeader('Content-Type', 'text/html');
      var message = JSON.stringify(session, function (key, value) {
        if (key === 'transport') { return; }
        return value;
      });
      res.end('<script>window.parent.postMessage(' + message + ', "*");window.close();</script>');
    }).fail(function (err) {
      console.error('OAUTH ERROR:', err);
      res.code = 500;
      res.end(err);
    });
  }

  if (pathname.slice(0, 6) === '/opjs/') {
    return send(req, pathname.slice(5))
      .root(pathJoin(__dirname, '..', 'lib'))
      .pipe(res);
  }

  send(req, pathname)
    .root(pathJoin(__dirname, 'public'))
    .pipe(res);
}

var api = {
  'update': function (request, transport) {
    var target = sessions[request.to].transport;
    if (!target) {
      throw new Error('Invalid transport ID');
    }
    request.from = transport.id;
    return target.request('update', request);
  },
  'bye': function (request, transport) {
    var target = sessions[request.to].transport;
    if (!target) {
      throw new Error('Invalid transport ID');
    }
    request.from = transport.id;
    return target.request('bye', request);
  },
  'peer-location-find': function (request, transport) {
    request.from = transport.id;
    var username = request.username;
    var transports = Object.keys(sessions).filter(function (id) {
      return sessions[id].username === username;
    }).map(function (id) {
      return sessions[id].transport;
    });
    var locations = transports.map(function (targetTransport) {
      var socket = targetTransport.socket._socket;
      return {
        localAddress: socket.localAddress,
        localPort: socket.localPort,
        remoteAddress: socket.remoteAddress,
        remotePort: socket.remotePort
      };
    });

    locations.forEach(function (targetTransport) {
      targetTransport.peerLocationFind(request).then(function (reply) {
        reply.from = targetTransport.id;
        transport.result(request, reply, true);
      }, function (reason) {
        transport.fail(request, reason);
      });
    });

    return {
      locations: locations
    };
  }
};

function wsHandler(socket) {
  var cookies = cookie.parse(socket.upgradeReq.headers.cookie || '');
  var id = cookies.session_id;
  var session = sessions[id];
  if (!session) {
    console.error('Invalid session id in cookie', cookies);
    return socket.close();
  }
  var transport = new Transport(api);
  session.transport = transport;
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
    delete sessions[id];
  });
}

// Start the server(s)
// Run in production mode if the process is root


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

