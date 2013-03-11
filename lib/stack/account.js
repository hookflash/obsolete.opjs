define(['opjs/stack/util'], function (util) {
  'use strict';

  function Account() {
    this._locationID = util.randomHex(32);
    this._finder = undefined;
    // Map PeerURI to Peer
    this._peers = {};
    // Map LocationID to Location
    this._locations = {};
  }

  // TODO: Implement these methods
  Account.prototype.getState = function () {};
  Account.prototype.getPeerContactSession = function () {};
  Account.prototype.getNATServers = function () {};
  Account.prototype.shutdown = function () {};
  Account.prototype.getDomain = function () {};
  Account.prototype.getSocket = function () {};
  Account.prototype.extractNextFinder = function () {};
  Account.prototype.isFinderReader = function () {};
  Account.prototype.removeLocation = function () {};
  Account.prototype.getPeerForLocal = function () {};
  Account.prototype.getLocationInfo = function () {};
  Account.prototype.getConnectionState = function () {};
  Account.prototype.send = function () {};
  Account.prototype.hintNowAvailable = function () {};
  Account.prototype.notifyMessageIncomingResponseNotSent = function () {};
  Account.prototype.getPeerFiles = function () {};
  Account.prototype.getPeerState = function () {};
  Account.prototype.getPeerLocations = function () {};
  Account.prototype.subscribe = function () {};
  // This evented API can likely be greatly simplified when implemented in
  // JavaScript
  Account.prototype.notifyDestroyed = function () {};
  Account.prototype.getRepository = function () {};
  Account.prototype.notifyServicePeerContactSessionStateChanged = function () {};
  Account.prototype.onAccountFinderStateChanged = function () {};
  Account.prototype.onAccountFinderMessageIncoming = function () {};
  Account.prototype.onAccountPeerLocationStateChanged = function () {};
  Account.prototype.onAccountPeerLocationMessageIncoming = function () {};
  Account.prototype.onLookupCompleted = function () {};
  Account.prototype.onRUDPICESocketStateChanged = function () {};
  Account.prototype.handleMessageMonitorMessageReceived = function () {};
  Account.prototype.onMessageMonitorTimedOut = function () {};
  Account.prototype.onStep = function () {};
  Account.prototype.onTimer = function () {};
  // These methods are designated as "private" in the reference implementation
  Account.prototype._isPending = function () {};
  Account.prototype._isReady = function () {};
  Account.prototype._isShuttingDown = function () {};
  Account.prototype._isShutdown = function () {};
  Account.prototype._log = function () {};
  Account.prototype._getDebugValueString = function () {};
  Account.prototype._cancel = function () {};
  Account.prototype._step = function () {};
  Account.prototype._stepTimer = function () {};
  Account.prototype._stepRepository = function () {};
  Account.prototype._stepPeerContactSession = function () {};
  Account.prototype._stepLocations = function () {};
  Account.prototype._stepSocket = function () {};
  Account.prototype._stepFinder = function () {};
  Account.prototype._stepPeers = function () {};
  Account.prototype._setState = function () {};
  Account.prototype._setError = function () {};
  Account.prototype._setFindState = function () {};
  Account.prototype._shouldFind = function () {};
  Account.prototype._shouldShutdownInactiveLocations = function () {};
  Account.prototype._shutdownPeerLocationsNotNeeded = function () {};
  Account.prototype._sendPeerKeepAlives = function () {};
  Account.prototype._performPeerFind = function () {};
  Account.prototype._handleFindRequestComplete = function () {};
  Account.prototype._handleFinderRelatedFailure = function () {};
  Account.prototype._notifySubscriptions = function () {};
  Account.prototype._notifySubscriptions = function () {};
  Account.prototype._notifySubscriptions = function () {};

  Account.prototype.getLocationID = function () {
    return this._locationID;
  };

  // addPeer
  // Add the specified peer to the Account's peer collection. (Rough equivalent
  // to the C++ implementation of `Account#findExistingOrUse`)
  // Arguments:
  // - <Peer> peer: The peer to add
  // Returns:
  //   A Peer instance. If the Peer already exists in the account's peer
  //   collection, then a reference to the account's Peer instance is returned.
  //   Otherwise, the provided instance is added and returned.
  Account.prototype.addPeer = function (peer) {
    var uri = peer.getPeerURI();
    var existing = this._peers[uri];
    if (existing) {
      return existing;
    }
    this._peers[uri] = peer;
    return peer;
  };

  // addLocation
  // Add the specified location to the Account's location collection. (Rough
  // equivalent to the C++ implementation of `Account#findExistingOrUse`)
  // Arguments:
  // - <Location> location: The location to add
  // Returns:
  //   A Location intance. If the Location already exists in the account's
  //   location collection, then a reference to the account's Location instance
  //   is returned. Otherwise, the provided instances is added and returned.
  Account.prototype.addLocation = function (location) {
    var id = location.getID();
    var existing = this._locations[id];
    if (existing) {
      return existing;
    }
    this._locations[id] = location;
    return location;
  };

  // removePeer
  // Remove the specified peer from the peer collection. (Rough equivalent to
  // the C++ implementation of `notifyDestroyed`)
  Account.prototype.removePeer = function (peer) {
    delete this._peers[peer.getURI()];
  };

  return Account;
});
