
const ASSERT = require("assert");

var WebSocketServer = require('ws').Server;


exports.main = function(options, callback) {
  try {

    options = options || {};

    options.port = options.port || 3002;

    var hostname = "localhost";

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

      socket.on('message', function(message) {
        try {
          var data = JSON.parse(message);
          var request = data.request;
          ASSERT.equal(request.$domain, hostname);
          var response = getPayload(request, options);
          if (!response) {
            throw new Error("Could not determine response for: " + message);
          }
          var payload = {
            "result": {
                "$domain": hostname,
                "$appid": request.$appid,
                "$id": request.$id,
                "$handler": request.$handler,
                "$method": request.$method,
                "$timestamp": (Date.now() / 1000)
            }
          };
          for (var key in response) {
            payload.result[key] = response[key];
          }
          socket.send(JSON.stringify(payload));
        } catch(err) {
          console.error(err.stack);
        }
      });

    });

  } catch(err) {
    return callback(err);
  }

  function getPayload(request, options) {
    if (request.$handler === "peer-finder" && request.$method === "session-create") {
      return {
        "server": "hooflash/1.0 (centos)",
        "expires": 483949923
      };
    } else
    if (request.$handler === "peer-finder" && request.$method === "session-delete") {
      return {
        "locations": {
          "location": [
            { "$id": "99609d8b1eb4c413813cbeb7c15137837d4037e9" },
            { "$id": "c8062df29e62d42a3dad60e57d9e84ba38e5ba47" }
          ]
        }
      };
    }
    return null;
  }

  return callback(null, {
    server: wsServer,
    port: options.port,
    hook: function(app) {
      app.post(/^\/\.helpers\/finder-server\/close-all-connections$/, function(req, res, next) {
        try {
          connections.forEach(function(socket) {
            socket.close();
          });
        } catch(err) {
          console.error(err.stack);
          res.writeHead(500);
          res.end(err.stack);
          return;
        }
        res.writeHead(200, {
          "Content-Type": "text/plain"
        });
        res.end("ok");
      });
      app.post(/^\/\.helpers\/finder-server\/connection-count$/, function(req, res, next) {
        res.writeHead(200, {
          "Content-Type": "text/plain"
        });
        res.end("" + connections.length);
      });
    }
  });
}
