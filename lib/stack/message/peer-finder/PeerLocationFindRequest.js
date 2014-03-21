define([
  '../MessageRequest',
  'opjs-primitives/util'
], function (MessageRequest, util) {
  'use strict';

  function PeerLocationFindRequest() {
  }

/*
  var LIFETIME = 1000 * 60 * 60 * 24;

  function PeerLocationFindRequest(location, peerFiles, contact) {
    this.location = location;
    this.peerFiles = peerFiles;
    this.contact = contact;
  }

  PeerLocationFindRequest.prototype = Object.create(MessageRequest.prototype,
    {
      constructor: PeerLocationFindRequest
    });

  PeerLocationFindRequest.prototype.getFindProof = function () {
    var expires = new Date().getTime() + LIFETIME;
    var nonce = util.randomHex(16);
    return {
      $id: this.contact.getId(),
      clientNonce: nonce,
      find: null,
      findSecretProof: util.hmac(this.contact, 'proof:' + nonce + ':' + expires),
      findSecretProofExpires: expires,
      peerSecretEncrypted: null,
      location: this.location
    };
  };

  // Only generate structure if excluded locations exist
  PeerLocationFindRequest.prototype.getExcludes = function () {
    var excludes = {};
    if (this.excludeLocations && this.excludeLocations.length) {
      excludes.locations = {
        locations: this.excludeLocations
      };
    }
    return excludes;
  };

  PeerLocationFindRequest.prototype.encode = function () {

    if (!this.peerFiles) {
      throw new Error('PeerLocationFindRequest [] peer files were missing.');
    }

    var peerFilePrivate = this.peerFiles.getPeerFilePrivate();
    if (peerFilePrivate) {
      throw new Error('PeerLocationFindRequest [] private peer file was missing.');
    }

    var peerFilePublic = this.peerFiles.getPeerFilePublic();
    if (!peerFilePublic) {
      throw new Error('PeerLocationFindRequest [] public peer file was missing.');
    }

    var findProof = this.getFindProof();
    return {
      findProofBundle: {
        findProof: findProof,
        signature: peerFilePrivate.sign(findProof)
      },
      exclude: this.getExcludes()
    };
  };
*/
  return PeerLocationFindRequest;
});
