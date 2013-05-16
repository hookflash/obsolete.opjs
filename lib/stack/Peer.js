define([
  'opjs/util',
  'opjs/stack/PublicPeerFile',
  'opjs/stack/PeerLocation',
  'opjs/crypto',
  'opjs/assert',
  'opjs/events'
],function (Util, PublicPeerFile, PeerLocation, Crypto, Assert, Events) {
  'use strict';

  /**
   * The representation of a remote peer contact
   * (but not specific to a particular location).
   * This object is responsible for holding the peer files.
   */
  function Peer(context, finder, contact) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._finder = finder;
  	self._contact = contact;

    self._candidateUsername = Util.randomHex(32);
    self._candidatePassword = Util.randomHex(32);

    self._publicPeerFile = null;

    self._locations = [];

    self._readyDeferred = Q.defer();
    self._ready = self._readyDeferred.promise;

    self._ready.then(function() {
      self._finder._account.emit("peer.new", self);
    });

  	self._finder.once("destroy", function() {
      self.emit("destroy");
  	});
    self.on("destroy", function() {
      self._finder._account.emit("peer.destroyed", self);
      self._ready = null;
      self._finder = null;
      self._contact = null;
      self._publicPeerFile = null;
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
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._contact;
  }

  Peer.prototype.fetchPublicPeerFile = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    if (this._publicPeerFile) return this._ready;
    this._publicPeerFile = new PublicPeerFile(this._context, this);
    this._publicPeerFile.ready().then(this._readyDeferred.resolve, this._readyDeferred.reject);
    return this._ready;
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

  return Peer;
});
