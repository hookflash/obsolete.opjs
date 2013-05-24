
define([
  'opjs/assert',
  'q/q',
  'opjs/util',
  'opjs/crypto',
  'cifre/forge/pki'
], function (Assert, Q, Util, Crypto, PKI) {

  PKI = PKI();

  'use strict';

  /**
   * Load and manage the peer files needed as part of the Open Peer model.
   */
  function PublicPeerFile(context, publicPeerFile) {
  	var self = this;

    (self._context = context).injectLogger(self);

    var publicPeerFileInfo = Crypto.parsePublicPeerFile(publicPeerFile);
    self._publicPeerFile = Object.create({
      contact: publicPeerFileInfo.contact
    });
    self._publicPeerFile.peer = publicPeerFile.peer;
    self._publicKey = publicPeerFileInfo.publicKey;

  	self._ready = Q.resolve();
  }

  PublicPeerFile.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  PublicPeerFile.prototype.getPublicPeerFile = function() {
    if (this._ready === null) throw new Error("Object has been destroyed");
    if (this._publicPeerFile === null) throw new Error("Public peer file not yet initialized. You need to wait for ready().");
    return this._publicPeerFile;
  }

  PublicPeerFile.prototype.getContactID = function() {
    return this.getPublicPeerFile().contact;
  }

  PublicPeerFile.prototype.getPublicKey = function() {
    if (this._ready === null) throw new Error("Object has been destroyed");
    if (this._publicKey === null) throw new Error("Public key not yet initialized. You need to wait for ready().");
    return this._publicKey;
  }

  // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindRequestA
  PublicPeerFile.prototype.makeFindSecretProof = function() {
    // Find secret proof - i.e. hmac(<find-secret [from public-peer-file-section-B]>, "proof:" + <client-nonce> + ":" + expires))
    var publicPeerFile = this.getPublicPeerFile();
    var publicPeerFileInfo = Crypto.parsePublicPeerFile(publicPeerFile);
    var info = {
      clientNonce: Util.randomHex(32),
      expires: Math.floor(Date.now()/1000) + (60 * 60 * 24)  // 24 hours
    }
    info.proof = Crypto.hmac(publicPeerFileInfo.findSecret, [
      "proof",
      info.clientNonce,
      info.expires
    ].join(":")).toHex();
    return info;
  }

  PublicPeerFile.prototype.getFindSecret = function() {
    var publicPeerFile = this.getPublicPeerFile();
    var publicPeerFileInfo = Crypto.parsePublicPeerFile(publicPeerFile);
    return publicPeerFileInfo.findSecret;
  }

  // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-PeerLocationFindRequestA
  PublicPeerFile.prototype.encryptPeerSecret = function(peerSecret) {
    // Peer secret (encrypted) - peer secret is a random key which is then encrypted using the public key of the peer receiving the find request
    return Crypto.encryptWithPublicKey(this.getPublicKey(), peerSecret);
  }

  return PublicPeerFile;

});
