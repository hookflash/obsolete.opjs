/*jshint node:true*/
'use strict';

var WebSocketServer = require('ws').Server;


exports.main = function(options, callback) {
  try {

    options = options || {};

    options.port = options.port || 3002;

    var connections = [];

    var wsServer = new WebSocketServer({
      port: options.port
    });
    wsServer.on('error', function(err) {
      return callback(err);
    });
    wsServer.on('connection', function (socket) {

      connections.push(socket);

      socket.on('close', function(err) {
          connections.splice(connections.indexOf(socket), 1);
      });

      socket.on('error', function(err) {
        console.error("ERROR[websocket-test-server]:", err.stack);
      });

      // TODO: Implement finder service methods.


    });

  } catch(err) {
    return callback(err);
  }

  return callback(null, {
    server: wsServer,
    port: options.port,
    hook: function(app) {
      app.post(/^\/\.helpers\/finder-server\/close-all-connections$/, function(req, res, next) {
        try {
          console.log("[finder-server] close all connections");          
          connections.forEach(function(socket) {
            socket.close();
          });
        } catch(err) {
          console.error(err.stack);
          res.writeHead(500);
          res.end(err.stack);
          return;
        }
        res.writeHead(200);
        res.end("ok");
      });
    }
  });
}
