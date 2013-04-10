/*jshint node:true*/
'use strict';

var WebSocketServer = require('ws').Server;


exports.main = function(options, callback) {
  try {

    options = options || {};

    options.port = options.port || 3001;

    var wsServer = new WebSocketServer({
      port: options.port
    });
    wsServer.on('error', function(err) {
      return callback(err);
    });
    wsServer.on('connection', function (socket) {

      socket.on('error', function(err) {
        console.error("ERROR[websocket-test-server]:", err.stack);
      });

      // Echo messages from client back to client
      socket.on('message', function (message) {
        socket.send('echo:' + message);
      });

    });

  } catch(err) {
    return callback(err);
  }

  return callback(null, {
    server: wsServer,
    port: options.port
  });
}
