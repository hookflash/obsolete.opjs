define([
  'opjs/stack/Bootstrapper',
  'opjs/stack/NamespaceGrant',
  'opjs/stack/Identity',
  'opjs/stack/Lockbox',
  'opjs/stack/PeerFiles',
  'opjs/stack/AccountFinder',
  'opjs/events',
  'opjs/util'
], function (Bootstrapper, NamespaceGrant, Identity, Lockbox, PeerFiles, AccountFinder, Events, Util) {
  'use strict';

  /**
   * Represents the user’s peer contact Open Peer account.
   * This is the master object that is key to initialize other objects needed for communication.
   * This object is responsible for coordinating the peers, connection to finder, connection to peers,
   * peer/location objects and holds the publication repository object.
   */
  function Account(context, stack, location) {
    var self = this;

    (self._context = context).injectLogger(self);

    self._stack = stack;
    self._location = location;

    self._peers = {};

    self._bootstrapper = new Bootstrapper(self._context, self);

    self._ready = self._bootstrapper.ready().then(function() {
      if (self._context.identity) {
        var identity = self._context.identity;
        delete self._context.identity;
        return self.addIdentity(identity);
      }
    });

    self.on("peer.added", function(peer) {
      self.log("[Account] Peer added '" + peer.getContact() + "'");
      self._peers[peer.getContact()] = peer;
    });
    self.on("peer.destroyed", function(peer) {
      self.log("[Account] Peer destroyed '" + peer.getContact() + "'");
      delete self._peers[peer.getContact()];
    });

    self._stack.on("reconnect", function() {
      self.emit("reconnect");
    });

    self._stack.once("destroy", function() {
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

  Account.prototype.addIdentity = function(identity) {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));

    if (self._identity) {
      // Add a second identity.
      return self._identity.addIdentity(identity).then(function() {

        self.emit("identity.added", identity);

        return self._lockbox.updateAccess(identity).then(function() {
          return self._identity.setLockboxInfo(identity, self._lockbox.getIdentityCredentials()).then(function() {
            return self._identity.setPublicPeerFile(identity, self._peerFiles.getPublicPeerFile());
          });
        });
      });
    }

    self._namespaceGrant = new NamespaceGrant(self._context, self);

    self._identity = new Identity(self._context, self);

    return self._identity.addIdentity(identity).then(function() {

      self.emit("identity.added", identity);

      self._lockbox = new Lockbox(self._context, self);

      return self._lockbox.requestAccess(identity).then(function() {

        self._peerFiles = new PeerFiles(self._context, self);

        return self._peerFiles.ready().then(function() {

          self._location.setContact(self._peerFiles.getContactID());

          return self._identity.setPublicPeerFile(identity, self._peerFiles.getPublicPeerFile()).then(function() {

            self._finder = new AccountFinder(self._context, self);

            return self._finder.ready();
          });
        });
      });
    });
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
