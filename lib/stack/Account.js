define([
  'opjs/stack/Bootstrapper',
  'opjs/stack/Identity',
  'opjs/stack/Lockbox',
  'opjs/stack/PeerFiles',
  'opjs/stack/AccountFinder',
  'opjs/events',
  'opjs/util'
], function (Bootstrapper, Identity, Lockbox, PeerFiles, AccountFinder, Events, Util) {
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

    self._peers = {};

    // First we initialize the `Bootstrapper` and wait until it is ready.

    self._bootstrapper = new Bootstrapper(context, self);

    self._ready = self._bootstrapper.ready().then(function() {

      // Next we initialize our `Identity` and wait until it is ready.

      self._identity = new Identity(context, self);

      return self._identity.ready().then(function() {

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
    });

    self.on("peer.new", function(peer) {
      self.log("[Account] New Peer '" + peer.getContact() + "'");
      self._peers[peer.getContact()] = peer;
    });
    self.on("peer.destroyed", function(peer) {
      self.log("[Account] Peer destroyed '" + peer.getContact() + "'");
      delete self._peers[peer.getContact()];
    });

    stack.once("destroy", function() {
      self._ready = null;
      self.emit("destroy");
      self._peers = {};
    });
  }

  Account.prototype = Object.create(Events.prototype);

  Account.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
  }

  Account.prototype.getBootstrapper = function() {
    if (this._ready === null) throw new Error("Object has been destroyed");
    return this._bootstrapper;
  }

  Account.prototype.getIdentity = function() {
    if (this._ready === null) throw new Error("Object has been destroyed");
    return this._identity;
  }

  Account.prototype.getLockbox = function() {
    if (this._ready === null) throw new Error("Object has been destroyed");
    return this._lockbox;
  }

  Account.prototype.getLocation = function() {
    return this._location;
  }

  return Account;
});
