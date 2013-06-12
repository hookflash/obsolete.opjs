
define([
  'opjs/shims',
  'opjs/stack/AccountLocation',
  'opjs/stack/Account',
  'opjs/request',
  'opjs/ws',
  'opjs/util',
  'opjs/events',
  'opjs/assert',
  'q/q',
  'opjs/context'
], function (Shims, AccountLocation, Account, Request, WS, Util, Events, Assert, Q, Context) {

  /**
   * Initialization object for the stack layer.
   */
  function Stack(options) {
  	var self = this;

    var context = new Context(options);
    (self._context = context).injectLogger(self);

    if (self._context._debug) {
      self.log("[Stack] Contect:", self._context);
    }

    self._account = new Account(self._context, self, new AccountLocation({
      id: self._context.locationID,
      deviceID: Util.getDeviceID(),
      ip: Util.getIP(),
      userAgent: Util.getUserAgent(),
      os: Util.getOS(),
      system: Util.getSystem(),
      host: Util.getHost()
    }));
    self._ready = self._account.ready();
  }

  Stack.prototype = Object.create(Events.prototype);

  Stack.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
  }

  Stack.prototype.addIdentity = function(identity) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._account.addIdentity(identity);
  }

  Stack.prototype.destroy = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));

    // Disconnect and destroy stack. No futher calls to stack possible.
    // Every object that has a `_ready` property should set it to `null`
    // and block all calls to any of its methods.

    this._ready = null;

    this.emit("destroy");

  	return Q.resolve();
  }

  Stack.prototype.reconnect = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));

    this.emit("reconnect");

    return Q.resolve();
  }

  return Stack;

});
