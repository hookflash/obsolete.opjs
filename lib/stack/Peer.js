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

    self._readyDeferred = Q.defer();
    self._ready = self._readyDeferred.promise;

    self._locations = [];

  	self._finder.once("destroy", function() {
  		self._ready = null;
      self._publicPeerFile = null;
      self.emit("destroy");
  	});
  }

  Peer.prototype = Object.create(Events.prototype);

  Peer.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  Peer.prototype.getContact = function() {
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
    return {
      "candidate": {
        "transport": "webSocket",
        "ip": "localhost",
        "port": 3000,
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
    var location = new PeerLocation(this._context, this);
    this._locations.push(location);
    return location.connectToLocationAsControlling(peerSecret, controllingLocation);
  }

  Peer.prototype.newControlledLocation = function(peerSecret, controllingLocation) {
    var location = new PeerLocation(this._context, this);
    this._locations.push(location);
    return location.connectToLocationAsControlled(peerSecret, controllingLocation);
  }

  return Peer;
});
