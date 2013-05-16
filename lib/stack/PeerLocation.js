define([
  'opjs/util',
  'opjs/crypto',
  'opjs/assert',
  'opjs/events',
  'opjs/p2p-relay-client'
],function (Util, Crypto, Assert, Events, RelayClient) {

  /**
   * Responsible to maintain a connection to a peer at a particular location.
   * The lifecycle of this object is tied to the lifetime of the connection of
   * the peer and must be replaced with a new instance should the connection die.
   * The object handles the setup phase of the connection through to the final
   * disconnection state.
   */
  function PeerLocation(context, peer) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._peer = peer;

    self._readyDeferred = Q.defer();
    self._ready = self._readyDeferred.promise;

    self._connection = null;

    self._details = null;

  	self._peer.once("destroy", function() {
      self._ready = null;
      if (self._connection) {
        self._connection.disconnect();
      }
  	});
  }

  PeerLocation.prototype = Object.create(Events.prototype);

  PeerLocation.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  PeerLocation.prototype.sendMessage = function(message) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    if (this._connection === null) return Q.reject(new Error("Connection has closed"));
    return this._connection.send(JSON.stringify(message));
  }

  // TODO: Refactor to remove relay when not needed any more.
  PeerLocation.prototype.connectToLocationAsControlling = function(peerSecret, controllingLocation) {
    var self = this;

    Assert.equal(typeof controllingLocation, "object");
    Assert.equal(typeof controllingLocation.candidates, "object");
    Assert.equal(typeof controllingLocation.candidates.candidate, "object");
    Assert.equal(controllingLocation.candidates.candidate.transport, "webSocket");
    Assert.equal(typeof controllingLocation.candidates.candidate.ip, "string");
    Assert.equal(typeof controllingLocation.candidates.candidate.port, "number");

    var wsUri = "ws://" + controllingLocation.candidates.candidate.ip + ":" + controllingLocation.candidates.candidate.port;

    self._connection = new RelayClient(self._context, wsUri);

    var controlledLocation = Q.defer();

    var deferred = Q.defer();

    function fail(err) {
      deferred.reject(err);
      if (self._connection) self._connection.disconnect();
      self._connection = null;
    }

    self._connection.on("error", fail);

    self._connection.on("connected", function() {

      // This is out of spec and serves as extra security for relay server connection.
      self._connection.once("message", function(message) {
        try {
          message = JSON.parse(message);
          Assert.equal(typeof message, "object");
          Assert.equal(typeof message.auth, "object");

          // Wait until we have the connection info from the location being controlled.
          return controlledLocation.promise.then(function(controlledLocation) {

            Assert.equal(message.auth.username, controlledLocation.candidates.candidate.usernameFrag);
            Assert.equal(message.auth.password, Crypto.decryptWithString(
              peerSecret,
              Crypto.iv(controlledLocation.candidates.candidate.usernameFrag),
              controlledLocation.candidates.candidate.passwordEncrypted
            ));

            // Connected authenticated.

            // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerToPeerProtocol-PeerIdentifyRequest
            var id = Util.randomHex(32);
            self._connection.once("message", function(message) {
              try {
                message = JSON.parse(message);
                Assert.equal(typeof message, "object");
                Assert.equal(typeof message.result, "object");
                Assert.equal(message.result.$id, id);
                Assert.equal(message.result.$handler, "p2p");
                Assert.equal(message.result.$method, "peer-identify");
                Assert.equal(typeof message.result.location, "object");
                Assert.equal(typeof message.result.location.details, "object");

                Assert.equal(message.result.location.contact, self._peer._contact);

                // TODO: Ensure expiry set in request has not been reached.

                self._details = message.result.location.details;

                self.log("[PeerLocation] Connected to '" + self._peer._contact + "'");

                // TODO: Send keepalive events.
                // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerToPeerProtocol-PeerKeepAliveRequest

                self._connection.on("message", function(message) {
                  self.emit("message", JSON.parse(message));
                });

                self.emit("connected");

                return deferred.resolve();

              } catch(err) {
                return fail(err);
              }
            });
            self._connection.send(JSON.stringify({
              "request": {
                "$id": id,
                "$handler": "p2p",
                "$method": "peer-identify",
                "$timestamp": Math.floor(Date.now()/1000),
                "peerIdentityProofBundle": self._peer._finder._account._peerFiles.signBundle("peerIdentityProof", {
                  "clientNonce": Util.randomHex(32),
                  "expires": Math.floor(Date.now()/1000) + 30,  // 30 seconds from now
                  "findSecret": self._peer.getPublicPeerFile().getFindSecret(),
                  "location": self._peer._finder._account.getLocation().getPayload(),
                  "peer": self._peer._finder._account._peerFiles.getPublicPeerFile().peer
                })
              }
            }));

          }).fail(fail);

        } catch(err) {
          return fail(err);
        }
      });
    });
    self._connection.on("disconnected", function() {
      self.log("[PeerLocation] Disconnected from '" + self._peer._contact + "'");
      self.emit("disconnected");
      self._connection = null;
    });

    self._connection.connect(self._peer._candidatePassword);

    return function(controlledLocationInfo) {
      try {
        Assert.equal(typeof controlledLocationInfo, "object");
        Assert.equal(typeof controlledLocationInfo.candidates, "object");
        Assert.equal(typeof controlledLocationInfo.candidates.candidate, "object");
        Assert.equal(controlledLocationInfo.candidates.candidate.transport, "webSocket");
        Assert.equal(typeof controlledLocationInfo.candidates.candidate.usernameFrag, "string");
        Assert.equal(typeof controlledLocationInfo.candidates.candidate.passwordEncrypted, "string");
        controlledLocation.resolve(controlledLocationInfo);
      } catch(err) {
        deferred.reject(err);
      }
      return deferred.promise;
    };
  }

  // TODO: Refactor to remove relay when not needed any more.
  PeerLocation.prototype.connectToLocationAsControlled = function(peerSecret, controllingLocation) {
    var self = this;

    var deferred = Q.defer();

    try {

      Assert.equal(typeof controllingLocation, "object");
      Assert.equal(typeof controllingLocation.candidates, "object");
      Assert.equal(typeof controllingLocation.candidates.candidate, "object");
      Assert.equal(controllingLocation.candidates.candidate.transport, "webSocket");
      Assert.equal(typeof controllingLocation.candidates.candidate.ip, "string");
      Assert.equal(typeof controllingLocation.candidates.candidate.port, "number");
      Assert.equal(typeof controllingLocation.candidates.candidate.usernameFrag, "string");
      Assert.equal(typeof controllingLocation.candidates.candidate.passwordEncrypted, "string");

      function fail(err) {
        deferred.reject(err);
        if (self._connection) self._connection.disconnect();
        self._connection = null;
      }

      var wsUri = "ws://" + controllingLocation.candidates.candidate.ip + ":" + controllingLocation.candidates.candidate.port;

      self._connection = new RelayClient(self._context, wsUri);
      self._connection.on("error", fail);
      self._connection.on("connected", function() {

        // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerToPeerProtocol-PeerIdentifyRequest
        self._connection.once("message", function(message) {

          try {
            message = JSON.parse(message);
            Assert.equal(typeof message, "object");
            Assert.equal(typeof message.request, "object");
            Assert.equal(message.request.$handler, "p2p");
            Assert.equal(message.request.$method, "peer-identify");
            Assert.equal(typeof message.request.peerIdentityProofBundle, "object");
            Assert.equal(typeof message.request.peerIdentityProofBundle.peerIdentityProof, "object");
            Assert.equal(typeof message.request.peerIdentityProofBundle.peerIdentityProof.location, "object");
            Assert.equal(typeof message.request.peerIdentityProofBundle.peerIdentityProof.location.details, "object");
            // TODO: Verify `message.peerIdentityProofBundle.signature`.

            // TODO: Ensure that `message.peerIdentityProofBundle.clientNonce` has not been used before.

            Assert.equal(message.request.peerIdentityProofBundle.peerIdentityProof.location.contact, self._peer._contact);

            // TODO: Verify identity with third party.
            self._peer.fetchPublicPeerFile();

            return self._peer.ready().then(function() {

              // TODO: Verify public peer file matches.

              Assert.equal(message.request.peerIdentityProofBundle.peerIdentityProof.findSecret, self._peer._finder._account._peerFiles.getFindSecret());

              self._details = message.request.peerIdentityProofBundle.peerIdentityProof.location.details;

              self._connection.send(JSON.stringify({
                "result": {
                  "$id": message.request.$id,
                  "$handler": "p2p",
                  "$method": "peer-identify",
                  "$timestamp": Math.floor(Date.now()/1000),
                  "location": self._peer._finder._account.getLocation().getPayload()
                }
              }));

              self.log("[PeerLocation] Connected to '" + self._peer._contact + "'");

              self._connection.on("message", function(message) {
                self.emit("message", JSON.parse(message));
              });

              self.emit("connected");

              return deferred.resolve();
            }).fail(fail);

          } catch(err) {
            return fail(err);
          }
        });

        // This is out of spec and serves as extra security for relay server connection.
        self._connection.send(JSON.stringify({
          handler: "auth",
          auth: {
            username: self._peer._candidateUsername,
            password: self._peer._candidatePassword
          }
        }));
      });
      self._connection.on("disconnected", function() {
        self.log("[PeerLocation] Disconnected from '" + self._peer._contact + "'");
        self.emit("disconnected");
        self._connection = null;
      });

      self._connection.connect(Crypto.decryptWithString(
        peerSecret,
        Crypto.iv(controllingLocation.candidates.candidate.usernameFrag),
        controllingLocation.candidates.candidate.passwordEncrypted
      ));
    } catch(err) {
      deferred.reject(err);
    }
    return deferred.promise;
  }

  return PeerLocation;
});
