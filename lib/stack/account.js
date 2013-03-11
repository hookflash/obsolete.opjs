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
