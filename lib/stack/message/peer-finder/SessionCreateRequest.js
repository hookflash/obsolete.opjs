
define(['../MessageRequest', 'opjs/util'], function (MessageRequest, util) {
  'use strict';

  function SessionCreateRequest() {
    this.finderID = undefined;
    this.locationInfo = undefined;
    this.peerFiles = undefined;
  }
/*
  SessionCreateRequest.prototype = Object.create(MessageRequest.prototype, {constructor: SessionCreateRequest});

  SessionCreateRequest.prototype.encode = function () {
    if (!this.peerFiles) {
      // TODO: Should this throw or log and return like the C++ code?
      throw new Error('SessionCreateRequest [] peer files was missing');
    }

    var peerFilePrivate = this.peerFiles.getPeerFilePrivate();

    if (!this.peerFilePrivate) {
      // TODO: Should this throw or log and return like the C++ code?
      throw new Error('SessionCreateRequest [] peer file private was missing');
    }

    var peerFilePublic = this.peerFiles.getPeerFilePrivate();

    if (!peerFilePublic) {
      // TODO: Should this throw or log and return like the C++ code?
      throw new Error('SessionCreateRequest [] peer file public was missing');
    }

    var sessionProof = {
      clientNonce: util.randomHex(16),
      expires: Math.floor(Date.now() / 1000) + (60 * 60) * 24,
      peer: peerFilePublic.encode()
    };

    if (this.finderID) {
      sessionProof.finder = { $id: this.finder };
    }

    if (this.locationInfo) {
      // TODO: What is locationInfo, does it need to be .encode()ed ?
      this.location = this.locationInfo.encode();
    }

    return {
      sessionProofBundle: {
        sessionProof: sessionProof,
        signature: peerFilePrivate.sign(sessionProof)
      }
    };
  };
*/
  return SessionCreateRequest;

});
