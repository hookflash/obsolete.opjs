// websocket-echo.js
// Simple echo server to enable early WebRTC demo.
// Adapted from [Video Conferencing in HTML5: WebRTC via Web
// Sockets](http://blog.gingertech.net/2012/06/04/video-conferencing-in-html5-webrtc-via-web-sockets/)
var WebSocketServer = require('websocket').server;
var urlParse = require('url').parse;
var pathJoin = require('path').join;
var send = require('send');
var http = require('http');
var PORT = process.env.PORT || process.getuid() ? 8080 : 80;
var clients = [];

var server = http.createServer(function(req, res) {
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

// create the server
wsServer = new WebSocketServer({
  httpServer: server
});

function sendCallback(err) {
  if (err) {
    console.error('send() error: ' + err);
  }
}

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
  console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
  var connection = request.accept(null, request.origin);
  console.log(' Connection ' + connection.remoteAddress);
  clients.push(connection);

  // This is the most important callback for us, we'll handle
  // all messages from users here.
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      // process WebSocket message
      console.log((new Date()) + ' Received Message ' + message.utf8Data);
      // broadcast message to all connected clients
      clients.forEach(function (outputConnection) {
        if (outputConnection != connection) {
          outputConnection.send(message.utf8Data, sendCallback);
        }
      });
    }
  });

  connection.on('close', function(connection) {
    // close user connection
    console.log((new Date()) + ' Peer disconnected.');
  });
});

server.listen(PORT, function () {
  console.log('Server listening at', server.address());
});

if (!process.getuid()) {
  // If we're running as root, drop down to a regular user after binding to 80
  var stat = require('fs').statSync(__filename);
  process.setgid(stat.gid);
  process.setuid(stat.uid);
}
