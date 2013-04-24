
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
        console.error("ERROR[finder-server]:", err.stack);
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
                "$timestamp": Math.floor(Date.now() / 1000)
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
    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-SessionCreateRequest
    if (request.$handler === "peer-finder" && request.$method === "session-create") {
      return {
        "server": "hooflash/1.0 (centos)",
        "expires": Math.floor(Date.now()/1000) + 1
      };
    } else
    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-SessionKeepAliveRequest
    if (request.$handler === "peer-finder" && request.$method === "session-keep-alive") {
      return {
        "expires": Math.floor(Date.now()/1000) + 1
      };
    } else
    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-SessionDeleteRequest
    if (request.$handler === "peer-finder" && request.$method === "session-delete") {
      ASSERT.equal(typeof request.locations, "object");
      ASSERT.equal(typeof request.locations.location, "object");
      ASSERT.equal(typeof request.locations.location.$id, "string");
      return {
        "locations": {
          "location": {
            "$id": request.locations.location.$id
          }
        }
      };
    } else
    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification#PeerFinderProtocol-PeerLocationFindRequestSinglePointToSinglePoint
    if (request.$handler === "peer-finder" && request.$method === "peer-location-find") {

// TODO: Look at connection to find peer we are trying to reach.

      return {
        "locations": {
          "location": {
            "$id": "170f5d7f6ad2293bb339e788c8f2ff6c",
            "contact": "peer://domain.com/900c9cb1aeb816da4bdf58a972693fce20e",
            "details": {
              "device": { "$id": "e31fcab6582823b862b646980e2b5f4efad75c69" },
              "ip": "28.123.121.12",
              "userAgent": "hookflash/1.0.1001a (iOS/iPad)",
              "os": "iOS v4.3.5",
              "system": "iPad v2",
              "host": "foobar"
            }
          }
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
