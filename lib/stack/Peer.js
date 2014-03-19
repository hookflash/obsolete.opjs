define([
  'opjs-primitives/util',
  'opjs/stack/PublicPeerFile',
  'opjs/stack/PeerLocation',
  'opjs-primitives/crypto',
  'opjs-primitives/assert',
  'opjs-primitives/events',
  'q/q'
],function (Util, PublicPeerFile, PeerLocation, Crypto, Assert, Events, Q) {
  'use strict';

  /**
   * The representation of a remote peer contact
   * (but not specific to a particular location).
   * This object is responsible for holding the peer files.
   */
  function Peer(context, finder) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._finder = finder;

    self._identity = null;
    self._publicPeerFile = null;
  	self._contact = null;

    self._candidateUsername = Util.randomHex(32);
    self._candidatePassword = Util.randomHex(32);

    self._locations = [];

    self._readyDeferred = Q.defer();
    self._ready = self._readyDeferred.promise;

    self._ready.then(function() {
      self._finder._account.emit("peer.added", self);
    });

  	self._finder.once("destroy", function() {
      self.emit("destroy");
  	});

    self.on("message", function(location, message) {
      if (!message.request) return;
      if (message.request.$handler === "peer-common") {
        self._finder._account._pubrepo.processRequest(self, message.request).fail(function(err) {
          self.error("[Peer] Message processing error:", err.stack);
        });
      }
    });

    self.on("destroy", function() {
      if (Q.isFulfilled(self._ready)) {
        self._finder._account.emit("peer.destroyed", self);
      }
      self._ready = null;
      self._finder = null;
      self._identity = null;
      self._publicPeerFile = null;
      self._contact = null;
      self._candidateUsername = null;
      self._candidatePassword = null;
      self._locations = [];
    });
  }

  Peer.prototype = Object.create(Events.prototype);

  Peer.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  Peer.prototype.getContact = function() {
    if (this._ready === null) throw new Error("Object has been destroyed");
    if (!this._contact) throw new Error("Contact ID not yet available!");
  	return this._contact;
  }

  Peer.prototype.setIdentity = function(identity) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    this._identity = identity;
    return this.setPublicPeerFile({
      peer: identity.peer
    });
  }

  Peer.prototype.setPublicPeerFile = function(publicPeerFile) {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    self._publicPeerFile = new PublicPeerFile(self._context, publicPeerFile);
    self._publicPeerFile.ready().then(function() {
      self._contact = self._publicPeerFile.getContactID();
    }).then(self._readyDeferred.resolve, self._readyDeferred.reject);
    return self._ready;
  }

  Peer.prototype.getPublicPeerFile = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._publicPeerFile;
  }

  Peer.prototype.getLocationCandidate = function(peerSecret) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    Assert.equal(typeof this._context._p2pRelayHost, "string");
    return {
      "candidate": {
        "transport": "webSocket",
        "ip": this._context._p2pRelayHost.split(":")[0],
        "port": parseInt(this._context._p2pRelayHost.split(":")[1]),
        "usernameFrag": this._candidateUsername,
        // `passwordEncrypted` is encrypted using the peer secret and the IV is the hash of the username frag
        "passwordEncrypted": Crypto.encryptWithString(
          peerSecret,
          Crypto.iv(this._candidateUsername),
          this._candidatePassword
        ),
        "priority": 5
      }
    };
  }

  Peer.prototype.newControllingLocation = function(peerSecret, controllingLocation) {
    var self = this;
    var location = new PeerLocation(self._context, self);
    location.on("connected", function() {
      self._locations.push(location);
      location.on("message", function(message) {
        self.emit("message", location, message);
      });
    });
    location.on("disconnected", function() {
      var index = self._locations.indexOf(location);
      if (index > -1) {
        self._locations.splice(index, 1);
      }
    });
    return location.connectToLocationAsControlling(peerSecret, controllingLocation);
  }

  Peer.prototype.newControlledLocation = function(peerSecret, controllingLocation) {
    var self = this;
    var location = new PeerLocation(self._context, self);
    location.on("connected", function() {
      self._locations.push(location);
      location.on("message", function(message) {
        self.emit("message", location, message);
      });
    });
    location.on("disconnected", function() {
      var index = self._locations.indexOf(location);
      if (index > -1) {
        self._locations.splice(index, 1);
      }
    });
    return location.connectToLocationAsControlled(peerSecret, controllingLocation);
  }

  Peer.prototype.sendMessage = function(message) {
    if (this._locations.length === 0) return Q.reject(new Error("No locations connected."));
    return Q.all(this._locations.map(function(location) {
      return location.sendMessage(message);
    }));
  }

  Peer.prototype.sendRequest = function(handler, method, payload) {
    var self = this;
    var deferred = Q.defer();
    try {
      var id = Util.randomHex(32);
      var timeoutId = setTimeout(function() {
          self.off("message", listener);
          return deferred.reject(new Error("Sending request to peer timed out!"));
      }, 20 * 1000);
      var listener = function(location, message) {
        if (!message.result) return;
        if (message.result.$id === id) {
          clearTimeout(timeoutId);
          self.off("message", listener);
          return deferred.resolve(message.result);
        }
      };
      self.on("message", listener);
      var request = Util.copy(payload);
      request.$id = id;
      request.$handler = handler;
      request.$method = method;
      self.sendMessage({
        "request": request
      });
    } catch(err) {
      deferred.reject(err);
    }
    return deferred.promise;
  }

  Peer.prototype.sendResult = function(request, payload) {
    var self = this;
    var deferred = Q.defer();
    try {
      var result = Util.copy(payload);
      result.$id = request.$id;
      result.$handler = request.$handler;
      result.$method = request.$method;
      self.sendMessage({
        "result": result
      });
    } catch(err) {
      deferred.reject(err);
    }
    return deferred.promise;
  }

  Peer.prototype.publishDoc = function(publication) {
    return this._finder._account._pubrepo.publishDoc(this, publication);
  }

  Peer.prototype.getDoc = function(criteria) {
    return this._finder._account._pubrepo.getDoc(this, criteria);
  }

  Peer.prototype.deleteDoc = function(criteria) {
    return this._finder._account._pubrepo.deleteDoc(this, criteria);
  }

  return Peer;
});
