
define([
  'opjs/assert',
  'q/q',
  'opjs/util',
  'opjs/crypto',
  'cifre/forge/pki'
], function (Assert, Q, Util, Crypto, PKI) {

  PKI = PKI();

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
    self._privateKey = null;
    self._publicKey = null;

  	self._ready = this._ensure();

  	self._account.once("destroy", function() {
  		self._ready = null;
      self._account = null;
      self._privatePeerFile = null;
      self._publicPeerFile = null;
      self._privateKey = null;
      self._publicKey = null;
  	});
  }

  PeerFiles.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  PeerFiles.prototype._ensure = function() {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));

    function finalize(privatePeerFile) {
      try {
        var privatePeerInfo = Crypto.parsePrivatePeerFile(privatePeerFile, {
            secret: self._context.secret
        });
        self._privateKey = privatePeerInfo.privateKey;
        self._publicKey = privatePeerInfo.publicKey;
        self._publicPeerFile = Object.create({
          contact: privatePeerInfo.contact
        });
        self._publicPeerFile.peer = JSON.parse(privatePeerInfo.publicPeerFile).peer;
        self._privatePeerFile = privatePeerFile;
      } catch(err) {
        return Q.reject(err);
      }
    }

    return self._account.getLockbox().getPrivatePeerFile().then(function(privatePeerFile) {      
      if (privatePeerFile) return finalize(privatePeerFile);

      // We don't already have a private peer file in the lockbox so we need to generate one
      // and store it in the lockbox.

      self.info("[PeerFiles] Generating new peer files");

      return self._account.getBootstrapper().getSalts(2).then(function(salts) {

        Assert.isArray(salts);
        Assert.isObject(salts[0]);
        Assert.isObject(salts[0].bundle);
        Assert.isObject(salts[1]);
        Assert.isString(salts[1]["#text"]);
        Assert.isString(self._context.secret);
        Assert.isString(self._context.domain);
        Assert.isNumber(self._context.publicPeerFileLifetime);

        // TODO: Do this in a worker thread.

        var pair = Crypto.generateKeyPair(KEY_SIZE);

        var publicPeerFile = Crypto.generatePublicPeerFile({
          lifetime: self._context.publicPeerFileLifetime,
          saltBundle: salts[0].bundle,
          // Must be known by other peer attempting to initiate a finder connection to this peer.
          // Set to `false` if you do not want other peers to be able to find you.
          // TODO: Add option in `self._context` to indicate if we want to be found.
          findSecret: Util.randomHex(32),
          identityBundle: null,
          privateKey: pair.privateKey,
          publicKey: pair.publicKey,
          domain: self._context.domain
        });

        var privatePeerFile = Crypto.generatePrivatePeerFile({
          contact: publicPeerFile.contact,
          salt: salts[1]["#text"],
          secret: self._context.secret,
          privateKey: pair.privateKey,
          publicPeerFile: publicPeerFile
        });

        return self._account.getLockbox().setPrivatePeerFile(privatePeerFile).then(function() {
          // TODO: What happens if the above fails?
          return finalize(privatePeerFile);
        });
      });
    });

    return Q.resolve();
  }

  PeerFiles.prototype.getPublicPeerFile = function() {
    if (this._ready === null) throw new Error("Object has been destroyed");
    if (this._publicPeerFile === null) throw new Error("Public peer file not yet initialized. You need to wait for ready().");
    return this._publicPeerFile;
  }

  PeerFiles.prototype.getFindSecret = function() {
    var publicPeerFile = this.getPublicPeerFile();
    var publicPeerFileInfo = Crypto.parsePublicPeerFile(publicPeerFile);
    return publicPeerFileInfo.findSecret;
  }

  PeerFiles.prototype.getPrivateKey = function() {
    if (this._ready === null) throw new Error("Object has been destroyed");
    if (this._privateKey === null) throw new Error("Private key not yet initialized. You need to wait for ready().");
    return this._privateKey;
  }

  PeerFiles.prototype.getContactID = function() {
    return this.getPublicPeerFile().contact;
  }

  // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindReplyE
  PeerFiles.prototype.decryptPeerSecret = function(peerSecretEncrypted) {
    return Crypto.decryptWithPrivateKey(this.getPrivateKey(), peerSecretEncrypted);
  }

  PeerFiles.prototype.signBundle = function(name, message) {
    if (this._ready === null) throw new Error("Object has been destroyed");
    if (this._privatePeerFile === null) throw new Error("Private peer file not yet initialized. You need to wait for ready().");
    return Crypto.signBundleForKeys(name, message, this._privateKey, this._publicKey);
  }

  return PeerFiles;

});
