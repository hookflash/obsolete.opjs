
define([
  'opjs/ws',
  'q/q',
  'opjs/events',
  'opjs/assert',
  'opjs/util',
  'opjs/stack/peer',
  'opjs/crypto'
], function (WS, Q, Events, Assert, Util, Peer, Crypto) {

  /**
   * Responsible for maintain a connection to the finder.
   * Lifecycle is tied to the finder. If the finder connection closes then
   * the object must die and be replaced with a new object.
   */
  function AccountFinder(context, account) {
  	var self = this;

    (self._context = context).injectLogger(self);

  	self._account = account;

  	self._ready = self._connect();

    self._connectionIndex = 0;
    self._connection = null;
    self._session = null;

  	account.once("destroy", function() {
  		self._ready = null;
      self.emit("destroy");
  	});
  }

  AccountFinder.prototype = Object.create(Events.prototype);

  AccountFinder.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  AccountFinder.prototype.isConnected = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    if (!this._connection) return false;
    return this._connectionIndex;
  }

  AccountFinder.prototype._connect = function() {
  	var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    if (self._connection) {
      return Q.resolve();
    }
    function connectToFinder(wsUri) {
      // Create websocket connection.
      return WS.connectTo(self._context, wsUri).then(function(connection) {

        // TODO: Tweak reconnect timeouts.
        var reconnectCount = 0;
        function reconnect() {
          // We had too many reconnect attempts so we throttle back.
          if (reconnectCount > 3) {
            self.error("[AccountFinder] " + reconnectCount + " reconnect attempts failed. Trying again in 30 seconds.");
            var timeoutId = setTimeout(function() {
              timeoutId = null;
              reconnectCount = 0;
              return reconnect();
            }, 30 * 1000);
            self.on("destroy", function() {
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
            });
            return;
          }
          // Try to connect by going through all finders.
          reconnectCount += 1;
          self.log("[AccountFinder] Attempting reconnect: " + reconnectCount);
          return self._connect().then(function() {
            reconnectCount = 0;
            self.log("[AccountFinder] Reconnect successful!");
          }, function(err) {
            self.log(err);
            self.log("[AccountFinder] Re-connect failed.");
            var timeoutId = setTimeout(function() {
              timeoutId = null;
              return reconnect();
            }, 1 * 1000);
            self.on("destroy", function() {
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
            });
            return;
          });
        }

        // If socket closes we try and re-connect (going through all finders) unless
        // we have been destroyed.
        connection.once("close", function() {
          self._connection = null;
          self.log("[AccountFinder] Connection to '" + wsUri + "' closed.");
          if (self._ready === null) return;
          self.log("[AccountFinder] Trigger reconnect.");
          return reconnect();
        });

        return connection;
      });
    }

    // Ask bootstrapper for a few finders to connect to.
    return self._account.getBootstrapper().getFinders().then(function(finders) {
      if (!finders || finders.length === 0) {
        throw new Error("[AccountFinder] No `finders` returned by `Bootstrapper.getFinders()`");
      }
      // Try each finder in trun until we successfully connect to one.
      var done = Q();
      finders.forEach(function(finder) {
        Assert.isObject(finder);
        Assert.isString(finder.srv);
        var hostname = finder.srv;
        if (!self._context._dev) {
          hostname = hostname.replace(/:\d*$/, ":9292");
        }
        var wsUri = "ws://" + hostname;
        done = Q.when(done, function() {
          // We are connected so we can skip the remainder.
          if (self._connection) return;
          // Try to connect to finder.
          return connectToFinder(wsUri).then(function(connection) {
            if (connection) {
              self._connectionIndex += 1;
              if (self._connection) {
                throw new Error("[AccountFinder] Old connection exists! It should have been destroyed previously.");
              }
              self._connection = connection;
              self.log("[AccountFinder] Connection to '" + wsUri + "' success!");
              if (self._session) {
                throw new Error("[AccountFinder] Old session exists! It should have been destroyed previously.");
              }
              self._session = new AccountFinderSession(self._context, self, self._account, self._connection, {
                finderID: finder.$id
              });
              self._session.once("destroy", function() {
                self._session = null;
                if (self._connection) {
                  self._connection.close();
                }
              });
              self._session.on("keepalive", function() {
                self.emit("keepalive");
              });
              return self._session.ready();
            }
            return;
          }, function(err) {
            self.log("[AccountFinder] Connection to '" + wsUri + "' failed. Trying next one.");
            return;
          });
        });
      });
      return Q.when(done, function() {
        if (self._connection) return;
        throw new Error("[AccountFinder] Unable to connect to any!");
      });
    });
  }

  AccountFinder.prototype.findPeer = function(contact) {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    if (!self.isConnected()) return Q.reject(new Error("Not connected to finder"));

    self.log("[AccountFinder] Find peer:", contact);

    var peer = new Peer(self._context, self, contact);
    peer.fetchPublicPeerFile();
    return peer.ready().then(function() {
      return (new PeerFindSession(self._context, self._session)).find(peer).then(function() {

        self.log("[AccountFinder] Peer found and locations connected:", contact);

        return peer;
      });
    });
  }


  function AccountFinderSession(context, finder, account, connection, options) {
    var self = this;
    (self._context = context).injectLogger(self);
    Assert.isObject(options);
    Assert.isString(options.finderID);
    self._finder = finder;
    self._account = account;
    self._connection = connection;

    self._keepaliveTimer = null;
    function scheduleKeepalive(timestamp) {
      var now = Math.floor(Date.now()/1000);
      var timeout = (timestamp - now);
      if (timeout < 0) timeout = 0;
      self._keepaliveTimer = setTimeout(function() {
        if (!self._keepaliveTimer) return;
        self._keepaliveTimer = null;
        if (!self._connection) return;
          self.log("[AccountFinderSession] Send keepalive for finder ID '" + options.finderID + "'");
          // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-SessionKeepAliveRequest
          return self._connection.makeRequestTo("peer-finder", "session-keep-alive").then(function(result) {
            Assert.isObject(result);
            Assert.isNumber(result.expires);
            self.emit("keepalive");
            scheduleKeepalive(parseInt(result.expires));
          }).fail(function(err) {
            // Ignore errors.
            self.error("[AccountFinderSession] keepalive", err.stack);
            // TODO: Should we really ignore errors or disconnect instead?
          });          
      }, timeout * 1000);
    }

    function destroy() {
      if (!self._ready) return;
      function deleteSession() {
        if (!self._connection) {
          return Q.resolve();
        }
        self.log("[AccountFinderSession] Deleting for finder ID '" + options.finderID + "'");
        return self._connection.makeRequestTo("peer-finder", "session-delete", {
          "locations": {
            "location": {
              "$id": self._account.getLocation().getID()
            }
          }
        }).then(function(result) {
          Assert.isObject(result);
          Assert.isObject(result.locations);
          Assert.isArray(result.locations.location);

          // TODO: Verify that our locationID (passed above) is in `result.locations.location`?

          self.log("[AccountFinderSession] Deleted for finder ID '" + options.finderID + "'");
        }).fail(function(err) {
          // Ignore errors.
        });
      }
      self._ready = null;
      if (self._keepaliveTimer) {
        clearTimeout(self._keepaliveTimer);
        self._keepaliveTimer = null;
      }
      return deleteSession().then(function() {
        self._account = null;
        self._connection = null;
        self.log("[AccountFinderSession] Closed for finder ID '" + options.finderID + "'");
        self.emit("destroy");
      });
    }
    self._connection.once("close", function() {
      if (!self._connection) return;
      self._connection = null;
      destroy();
    });
    self._account.once("destroy", destroy);

    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-SessionCreateRequest
    // Session ID
    self.log("[AccountFinderSession] Creating for finder ID '" + options.finderID + "'");

    var publicPeerFile = self._account._peerFiles.getPublicPeerFile();
    Assert.isObject(publicPeerFile);
    Assert.isObject(publicPeerFile.peer);

    self._ready = self._connection.makeRequestTo("peer-finder", "session-create", {
      "sessionProofBundle": self._account._peerFiles.signBundle("sessionProof", {
        "finder": {
          "$id": options.finderID
        },
        // Client nonce - cryptographically random one time use key
        "clientNonce": Util.randomHex(32),
        // Expiry for the one time use token
        "expires": Math.floor(Date.now()/1000) + 60,  // 60 seconds from now
        "location": self._account.getLocation().getPayload(),
        "peer": publicPeerFile.peer
      })
    }).then(function(result) {
      Assert.isObject(result);
      Assert.isString(result.server);
      Assert.isNumber(result.expires);
      scheduleKeepalive(parseInt(result.expires));
      self.log("[AccountFinderSession] Created for finder ID '" + options.finderID + "'");

      self._connection.on("message", function(message) {
        // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindRequestD
        if (message.request && message.request.$handler === "peer-finder" && message.request.$method === "peer-location-find") {
          self._onPeerFindRequest(message.request);
        }        
      });

    });
  }

  AccountFinderSession.prototype = Object.create(Events.prototype);

  AccountFinderSession.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
  }

  // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindRequestD
  AccountFinderSession.prototype._onPeerFindRequest = function(request) {
    var self = this;

    try {

      Assert.isObject(request.findProofBundle);
      Assert.isObject(request.findProofBundle.findProof);
      Assert.isObject(request.findProofBundle.signature);
      // TODO: Verify `result.findProofBundle.signature`.

      Assert.isObject(request.findProofBundle.findProof.location);
      Assert.isString(request.findProofBundle.findProof.location.contact);

      self.log("[AccountFinderSession] Replying to peer find request from:", request.findProofBundle.findProof.location.contact);

      var peer = new Peer(self._context, self._finder, request.findProofBundle.findProof.location.contact);

      var peerSecret = self._account._peerFiles.decryptPeerSecret(request.findProofBundle.findProof.peerSecretEncrypted);
      var location = self._account.getLocation().getPayload();
      location.candidates = peer.getLocationCandidate(peerSecret);

      // Establish controlled peer connection.
      peer.newControlledLocation(peerSecret, request.findProofBundle.findProof.location).then(function() {
        // Connected.
        // TODO: Add peer to Account.
      }).done();

      // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindReplyE
      return self._connection.sendReplyTo(request, {
        "findProofBundle" : self._account._peerFiles.signBundle("findProof", {
          "requestfindProofBundleDigestValue": request.findProofBundle.signature.digestValue,
          "location": location
        }),
        "routes": request.routes
      }).done();

    } catch(err) {
      self.error(err.stack);
    }
  }


  function PeerFindSession(context, session) {
    var self = this;
    (self._context = context).injectLogger(self);
    self._session = session;

    self._peerSecret = Util.randomHex(32);
  }

  // @see http://docs.openpeer.org/OpenPeerProtocolSpecification#PeerFinderProtocol-PeerLocationFindRequestSinglePointToSinglePoint
  PeerFindSession.prototype.find = function(peer) {
    var self = this;

    self.log("[PeerFindSession] Created for:", peer.getContact());

    var deferred = Q.defer();

    try {

      var timeout = null;
      var locationsRequested = null;
      var locationsReplied = {};
      var locationConnections = {};

      function checkIfAllReplied() {
        if (!locationsRequested) {
          // We have yet to receive a list of locations that will be contacted.
          return false;
        }
        for (var locationKey in locationsReplied) {
          if (!locationsRequested[locationKey]) {
            throw new Error("Got reply from location that was never requested!");
          }
          // Tell PeerLocation where to expect connection from and keep promise that will
          // resolve once connection has been established.
          locationConnections[locationKey] = locationsRequested[locationKey](locationsReplied[locationKey].location);
          delete locationsRequested[locationKey];
        }
        if (Object.keys(locationsRequested).length === 0) {
          self.log("[PeerFindSession] All locations responded");

          // Now that all locations have responded we wait until all locations have connected.
          var done = Q.resolve();
          for (var locationKey in locationConnections) {
            done = Q.when(done, function() {
              return locationConnections[locationKey];
            });
          }
          return Q.when(done, function() {
            // All locations have connected.

            clearTimeout(timeout);
            deferred.resolve();
            return true;

          }, deferred.reject);
        }
        return false;
      }


      // Register listener that fires when each peer replies.
      // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindReplyG
      
      function onPeerLocationFindReply(message) {
        if (message.reply && message.reply.$handler === "peer-finder" && message.reply.$method === "peer-location-find") {

          Assert.isObject(message.reply.findProofBundle);
          Assert.isObject(message.reply.findProofBundle.findProof);
          Assert.isObject(message.reply.findProofBundle.signature);
          // TODO: Verify `result.findProofBundle.signature`.

          Assert.isObject(message.reply.findProofBundle.findProof.location);
          Assert.isString(message.reply.findProofBundle.findProof.location.$id);

          self.log("[PeerFindSession] Got response for location:", message.reply.findProofBundle.findProof.location.$id);

          var locationKey = message.reply.findProofBundle.findProof.requestfindProofBundleDigestValue + ":" + message.reply.findProofBundle.findProof.location.$id;

          locationsReplied[locationKey] = message.reply.findProofBundle.findProof;

          return checkIfAllReplied();
        }
      }
      self._session._connection.on("message", onPeerLocationFindReply);

      // Issue peer find request to finder.
      // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindRequestA

      // Wait for all locations to respond and connect with timeout of 30 seconds.
      timeout = setTimeout(function() {
        self.error("[PeerFindSession] Timeout: Not all locations responded in time.");
        return deferred.reject(new Error("Locations took too long to respond."));
      }, 30 * 1000);


      var controllingLocation = self._session._account.getLocation().getPayload();
      controllingLocation.candidates = peer.getLocationCandidate(self._peerSecret)

      var findSecretProof = peer.getPublicPeerFile().makeFindSecretProof();
      var findProofBundle = self._session._account._peerFiles.signBundle("findProof", {
        // TODO: Is this the session ID or what is it used for?
        "$id": Util.randomHex(32),
        // Client nonce - cryptographically random one time use key
        "clientNonce": findSecretProof.clientNonce,
        "findSecretProof": findSecretProof.proof,
        "findSecretProofExpires": findSecretProof.expires,
        // Contact id of contact to be found
        "find": peer.getContact(),
        "peerSecretEncrypted": peer.getPublicPeerFile().encryptPeerSecret(self._peerSecret),
        "location": controllingLocation
      });

      self._session._connection.makeRequestTo("peer-finder", "peer-location-find", {
        "findProofBundle": findProofBundle,
        "exclude": {
          "locations": {
            "location": {}
          }
        }
      }).then(function(result) {

        // Peer find is underway and all `locations` will be contacted.
        locationsRequested = {};
        Util.arrayForPayloadObject(result.locations && result.locations.location).forEach(function(location) {
          if (!location.$id || !location.contact) return;
          self.log("[PeerFindSession] Waiting for location to respond:", location.$id);
          // Establish controlling peer connection.
          locationsRequested[findProofBundle.signature.digestValue + ":" + location.$id] = peer.newControllingLocation(self._peerSecret, controllingLocation);
        });

        return checkIfAllReplied();
      }).fail(deferred.reject);
    } catch(err) {
      deferred.reject(err);
    }

    function finalize() {
      self._session._connection.removeListener("message", onPeerLocationFindReply);
      self._session = null;
    }
    return Q.when(deferred.promise, function() {
      finalize();
    }).fail(function(err) {
      clearTimeout(timeout);
      finalize();
      throw err;
    });
  }


  return AccountFinder;

});
