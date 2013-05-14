define([
  'opjs/util',
  'opjs/stack/PublicPeerFile',
  'opjs/crypto'
],function (Util, PublicPeerFile, Crypto) {
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

    self._publicPeerFile = new PublicPeerFile(context, self);

    self._ready = self._publicPeerFile.ready();

  	self._finder.once("destroy", function() {
  		self._ready = null;
      self._publicPeerFile = null;
  	});
  }

  Peer.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  Peer.prototype.getContact = function() {
  	return this._contact;
  }

  Peer.prototype.getPublicPeerFile = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._publicPeerFile;
  }

  Peer.prototype.getLocationCandidates = function(peerSecret) {
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

  return Peer;
});
