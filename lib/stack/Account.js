define([
  'opjs/stack/Bootstrapper',
  'opjs/stack/Lockbox',
  'opjs/stack/PeerFiles',
  'opjs/stack/AccountFinder',
  'opjs/stack/Peer',
  'opjs/events',
  'opjs/util'
], function (Bootstrapper, Lockbox, PeerFiles, AccountFinder, Peer, Events, Util) {
  'use strict';

  /**
   * Represents the user’s peer contact Open Peer account.
   * This is the master object that is key to initialize other objects needed for communication.
   * This object is responsible for coordinating the peers, connection to finder, connection to peers,
   * peer/location objects and holds the publication repository object.
   */
  function Account(context, stack, location) {
    var self = this;

    context.injectLogger(self);

    self._stack = stack;
    self._location = location;

    // First we initialize the `Bootstrapper` and wait until it is ready.

    // TODO: Set third argument to host of bootstrapping service
    //       instead of using our own host (from which our app was served).
    self._bootstrapper = new Bootstrapper(context, self, Util.getHost());

    self._ready = self._bootstrapper.ready().then(function() {

      // Next we initialize our `Lockbox` and wait until they are ready.

      self._lockbox = new Lockbox(context, self);

      return self._lockbox.ready().then(function() {

        // Next we initialize our `PeerFiles` and wait until they are ready.

        self._peerFiles = new PeerFiles(context, self);

        return self._peerFiles.ready().then(function() {

          self._location.setContact(self._peerFiles.getContactID());

          // Finally we initialize our `AccountFinder` session.

          self._finder = new AccountFinder(context, self);

          return self._finder.ready().then(function() {

            // We are all ready:
            //  * Contacted lockbox
            //  * Have our peer files
            //  * Connected to finder

          });
        });
      });
    });
    stack.once("destroy", function() {
      self._ready = null;
      self.emit("destroy");
    });
  }

  Account.prototype = Object.create(Events.prototype);

  Account.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
  }

  Account.prototype.getBootstrapper = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._bootstrapper;
  }

  Account.prototype.getLocation = function() {
    return this._location;
  }

  // @experimental
  Account.prototype.getPeerURI = function() {

    // TODO: Construct proper peer URI.

    return "peer:domain.com/" + this._locationID;
  }

  // @experimental
  Account.prototype.connectToPeer = function(peerURI) {

    this.log("TODO: Connect to peer", peerURI);

    // TODO: Use `peerURI` to lookup peer via AccountFinder.

    return Q.resolve(new Peer(this, null, ""));
  }


/*

  function Account(options) {

    options = options || {};


    // TODO: Derive locationID as `locationID !== options.deviceID`?
    this._locationID = options.deviceID || util.randomHex(32);
    this._finder = new AccountFinder(options);
    // Map PeerURI to Peer
    this._peers = {};
    // Map LocationID to Location
    this._locations = {};
  }

  Account.prototype.getLocationID = function () {
    return this._locationID;
  };

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
*/

  return Account;
});
