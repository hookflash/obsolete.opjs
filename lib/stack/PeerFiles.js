
define([
  'opjs/assert',
  'q/q',
  'opjs/crypto'
], function (Assert, Q, Crypto) {

  'use strict';

  // TODO: Increae this before going live.
  var KEY_SIZE = 1028;

  /**
   * Load and manage the peer files needed as part of the Open Peer model.
   */
  function PeerFiles(context, account) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._account = account;

    self._privatePeerFile = null;
    self._publicPeerFile = null;

  	self._ready = this._ensure();

  	self._account.once("destroy", function() {
  		self._ready = null;
      self._account = null;
      self._privatePeerFile = null;
      self._publicPeerFile = null;
  	});
  }

  PeerFiles.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  PeerFiles.prototype._ensure = function() {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));

    return self._account.getBootstrapper().getSalts(2).then(function(salts) {

      Assert.isArray(salts);
      Assert.isObject(salts[0]);
      Assert.isObject(salts[0].bundle);
      Assert.isObject(salts[1]);
      Assert.isString(salts[1]["#text"]);
      Assert.isString(self._context.secret);
      Assert.isString(self._context.domain);
      Assert.isString(self._context.findSecret);
      Assert.isNumber(self._context.publicPeerFileLifetime);

      // TODO: Get private key from private peer file if we already have one.
      var pair = Crypto.generateKeyPair(KEY_SIZE);

      self._publicPeerFile = Crypto.generatePublicPeerFile({
        lifetime: self._context.publicPeerFileLifetime,
        saltBundle: salts[0].bundle,
        findSecret: self._context.findSecret,
        identityBundle: null,
        privateKey: pair.privateKey,
        publicKey: pair.publicKey,
        domain: self._context.domain
      });

      self._privatePeerFile = Crypto.generatePrivatePeerFile({
        contact: self._publicPeerFile.contact,
        salt: salts[1]["#text"],
        secret: self._context.secret,
        privateKey: pair.privateKey,
        publicPeerFile: self._publicPeerFile
      });
    });

    return Q.resolve();
  }

  PeerFiles.prototype.getContactID = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    if (this._publicPeerFile === null) return Q.reject(new Error("Public peer file not yet initialized. You need to wait for ready()."));
    return this._publicPeerFile.contact;
  }

  return PeerFiles;

});
