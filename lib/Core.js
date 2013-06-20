
define([
  'opjs/core/Contact',
  'opjs/events',
  'q/q'
], function (Contact, Events, Q) {

  function Core(context, stack) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._stack = stack;

    self._contact = new Contact(self._context, self);
    self._ready = self._contact.ready();

    self._stack._account.on("identity.added", function(identity) {

      return self._contact.requestAccess(identity);

    });

    self._stack.once("destroy", function() {
      self._ready = null;
      self.emit("destroy");
      self._contact = null;
      self._stack = null;
    });
  }

  Core.prototype = Object.create(Events.prototype);

  Core.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
  }

  return Core;

});
