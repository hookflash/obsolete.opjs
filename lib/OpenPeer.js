
define([
  'opjs/Stack',
  'opjs/Core',
  'opjs-primitives/events',
  'q/q'
], function (Stack, Core, Events, Q) {
  "use strict";

  /**
   * The Open Peer API entry point for core + stack accessible by clients.
   */
  function OpenPeer(options) {
    var self = this;

    options = options || {};

    self._stack = new Stack(options);

    self._core = new Core(self._stack._context, self._stack);

    self._ready = self._stack.ready();

    self._core._contact.on("contacts.loaded", function(identity) {
      self._ready.then(function() {
        self.emit("contacts.loaded", identity);
      });
    });
  }

  OpenPeer.prototype = Object.create(Events.prototype);

  OpenPeer.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
  };

  OpenPeer.prototype.getContacts = function() {
    var self = this;
    return self.ready().then(function() {
      return self._core._contact.getContacts();
    });
  };

  OpenPeer.prototype.addIdentity = function(identity) {
    var self = this;
    return self.ready().then(function() {
      return self._stack.addIdentity(identity);
    });
  };

  OpenPeer.prototype.destroy = function() {
    return this._stack.destroy();
  };

  return OpenPeer;

});
