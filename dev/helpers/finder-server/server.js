
const ASSERT = require("assert");

var WebSocketServer = require('ws').Server;


exports.main = function(options, callback) {
  try {

    options = options || {};

    options.port = options.port || 3002;

    var hostname = "localhost";

    var connections = [];
    var sessions = {};

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
          var request = null;
          if (data.request) {
            request = data.request;
            request._type = "request";
          } else
          if (data.reply) {
            request = data.reply;
            request._type = "reply";
          }
          ASSERT.equal(request.$domain, hostname);

          function getPayloadHeader() {
            return {
              "$domain": hostname,
              "$appid": request.$appid,
              "$id": request.$id,
              "$handler": request.$handler,
              "$method": request.$method,
              "$timestamp": Math.floor(Date.now() / 1000)
            };
          }

          var response = getPayload(socket, request, options, getPayloadHeader);
          if (request._type === "request") {
            if (!response) {
              throw new Error("Could not determine response for: " + message);
            }
            var payload = {
              "result": getPayloadHeader()
            };
            for (var key in response) {
              payload.result[key] = response[key];
            }
            socket.send(JSON.stringify(payload));
          }
        } catch(err) {
          console.error(err.stack);
        }
      });

      socket.send("ready");

    });

  } catch(err) {
    return callback(err);
  }

  function sessionForLocation(locationId) {
    for (var sessionId in sessions) {
      if (sessions[sessionId].location.$id === locationId) {
        return sessions[sessionId];
      }
    }
    return false;
  }

  function sessionForContact(contactId) {
    for (var sessionId in sessions) {
      if (sessions[sessionId].location.contact === contactId) {
        return sessions[sessionId];
      }
    }
    return false;
  }

  function sessionForSocket(socket) {
    for (var sessionId in sessions) {
      if (sessions[sessionId].socket === socket) {
        return sessions[sessionId];
      }
    }
    return false;
  }

  function sessionForId(sessionId) {
    if (!sessions[sessionId]) {
      return false;
    }
    if (connections.indexOf(sessions[sessionId].socket) === -1) {
      console.log("[finder-server]", "WARNING: Removed session '" + sessionId + "' after connection gone without session-delete.");
      delete sessions[sessionId];
      return false;
    }
    return sessions[sessionId];
  }

  function getPayload(socket, request, options, getPayloadHeader) {
    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-SessionCreateRequest
    if (request._type === "request" && request.$handler === "peer-finder" && request.$method === "session-create") {
      sessions[request.sessionProofBundle.sessionProof.$id] = {
        id: request.sessionProofBundle.sessionProof.$id,
        socket: socket,
        location: request.sessionProofBundle.sessionProof.location
      };
      return {
        "server": "hooflash/1.0 (centos)",
        "expires": Math.floor(Date.now()/1000) + 1
      };
    } else
    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-SessionKeepAliveRequest
    if (request._type === "request" && request.$handler === "peer-finder" && request.$method === "session-keep-alive") {
      return {
        "expires": Math.floor(Date.now()/1000) + 1
      };
    } else
    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-SessionDeleteRequest
    if (request._type === "request" && request.$handler === "peer-finder" && request.$method === "session-delete") {
      ASSERT.equal(typeof request.locations, "object");
      ASSERT.equal(typeof request.locations.location, "object");
      ASSERT.equal(typeof request.locations.location.$id, "string");
      var session = sessionForLocation(request.locations.location.$id);
      if (!session) {
        console.log("[finder-server]", "WARNING: Could not find session for location '" + request.locations.location.$id + "'.");
      }
      delete sessions[session.id];
      return {
        "locations": {
          "location": {
            "$id": request.locations.location.$id
          }
        }
      };
    } else
    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindRequestA
    if (request._type === "request" && request.$handler === "peer-finder" && request.$method === "peer-location-find") {
      ASSERT.equal(typeof request.findProofBundle, "object");
      ASSERT.equal(typeof request.findProofBundle.findProof, "object");      
      ASSERT.equal(typeof request.findProofBundle.findProof.find, "string");
      ASSERT.equal(typeof request.findProofBundle.findProof.location, "object");
      ASSERT.equal(typeof request.findProofBundle.findProof.location.$id, "string");

      var ownSession = sessionForLocation(request.findProofBundle.findProof.location.$id);
      var peerSession = sessionForContact(request.findProofBundle.findProof.find);

      // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindResultB
      if (!peerSession) {
        return {
          "locations": {
            "location": {}
          }
        };
      }

      // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindRequestD
      var payload = {
        "request": getPayloadHeader()
      };
      payload.request.findProofBundle = request.findProofBundle;
      payload.request.routes = {
        route: {
          $id: ownSession.id
        }
      };
      try {
        peerSession.socket.send(JSON.stringify(payload));
      } catch(err) {
        console.error("[finder-server] Error sending message to session: " + peerSession.id);
        throw err;
      }

      return {
        "locations": {
          "location": peerSession.location
        }
      };
    } else
    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindReplyE
    if (request._type === "reply" && request.$handler === "peer-finder" && request.$method === "peer-location-find") {

      ASSERT.equal(typeof request.findProofBundle, "object");
      ASSERT.equal(typeof request.findProofBundle.findProof, "object");
      ASSERT.equal(typeof request.routes, "object");
      ASSERT.equal(typeof request.routes.route, "object");
      ASSERT.equal(typeof request.routes.route.$id, "string");

      var session = sessionForId(request.routes.route.$id);
      if (!session) {
        console.log("[finder-server]", "WARNING: Could not find session for id '" + request.routes.route.$id + "'.");
      }

      // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindReplyG
      var payload = {
        "reply": getPayloadHeader()
      };
      payload.reply.findProofBundle = request.findProofBundle;
      session.socket.send(JSON.stringify(payload));
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
            var session = sessionForSocket(socket);
            if (session) {
              delete sessions[session.id];
            }
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
        if (Object.keys(sessions).length !== connections.length) {
          console.log("[finder-server]", "WARNING: Session count '" + Object.keys(sessions).length + "' != connection count '" + connections.length + "'.");
        }
        res.end("" + connections.length);
      });
    }
  });
}
