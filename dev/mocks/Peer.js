define(function () {
  'use strict';

  function PeerMock() {
    this._peerURI = String(Math.random());
  }

  PeerMock.prototype.getPeerURI = function () {
    return this._peerURI;
  };

  // For testing purposes only
  PeerMock.prototype.$setPeerURI = function (peerURI) {
    this._peerURI = peerURI;
  };

  return PeerMock;
});
