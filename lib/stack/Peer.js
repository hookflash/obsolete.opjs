define([
  'q/q'
], function (Q) {
  'use strict';

  var uriRegex = /^peer:\/\/([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}\/([a-f0-9][a-f0-9])+$/;

  /**
   * The representation of a remote peer contact (but not specific to a particular location).
   * This object is responsible for holding the peer files.
   */
  function Peer(account, peerFilePublic, peerURI) {
    this._account = account;
    this._peerFilePublic = peerFilePublic;
    this._peerURI = peerURI;
    // If an analogous Peer object already exists in the provided account,
    // return a reference to that object.
    return account.addPeer(this);
  }

  Peer.prototype.getPeerURI = function() {
    return this._peerURI;
  }

  var isValid = Peer.isValid = uriRegex.test.bind(uriRegex);

  // splitURI
  // Separate a Peer URI string into its domain and Contact ID components
  // Arguments:
  // - <string> peerURI: A string representing the Peer URI
  // Returns:
  //   If the Peer URI is valid, an object literal containing the Peer URI
  //   components: `domain` and `contactID` (`false` otherwise)
  Peer.splitURI = function (peerURI) {

    var slashPos;

    if (!isValid(peerURI)) {
      return false;
    }

    slashPos = peerURI.indexOf('/', 7);
    return {
      domain: peerURI.slice(7, slashPos),
      contactID: peerURI.slice(slashPos + 1)
    };
  };

  // joinURI
  // Given the components of a Peer URI, generate the corresponding Peer URI
  // Arguments:
  // - <object> uriParts: The Peer URI components, specified with the
  //   non-optional properties `domain` and `contactID`
  // Returns:
  //   A valid Peer URI if the supplied components were valid, `false`
  //   otherwise
  Peer.joinURI = function (urlParts) {
    var uri;

    if (!arguments.length) {
      return false;
    }

    uri = 'peer://' + urlParts.domain + '/' + urlParts.contactID;

    if (!Peer.isValid(uri)) {
      return false;
    }

    return uri;
  };

  Peer.prototype.sendMessage = function(message) {

    console.log("Send message to peer", message);

    // TODO: Send message to peer.

    return Q.resolve();
  }

  return Peer;
});
