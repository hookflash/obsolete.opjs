/*global require, __dirname */
(function () {
  'use strict';

  var http = require('http');
  var urlParse = require('url').parse;
  var pathJoin = require('path').join;
  var send = require('send');
  var WebSocketServer = require('ws').Server;

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

  var wsServer = new WebSocketServer({server: server});
  wsServer.on('connection', function (socket) {
    socket.on('message', function (message) {
      socket.send(message);
    });
    socket.send('Hello');
  });



  server.listen(8080, function () {
    console.log('Server listening at', server.address());
  });

}());
