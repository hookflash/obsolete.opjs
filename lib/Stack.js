
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
], function (Shims, AccountLocation, Account, Request, WS, Util, Events, Assert, Q) {

  /**
   * Initialization object for the stack layer.
   */
  function Stack(options) {
  	var self = this;

    options = options || {};

    self._appID = options.appID || Util.randomHex(32);

    Request.setContext({
      "appid": self._appID
    });
    WS.setContext({
      "appid": self._appID
    });

    self._account = new Account(self, new AccountLocation({
      id: options.locationID || Util.randomHex(32),
      deviceID: Util.getDeviceID(),
      ip: Util.getIP(),
      userAgent: Util.getUserAgent(),
      os: Util.getOS(),
      system: Util.getSystem(),
      host: Util.getHost()
    }), options);

    self._ready = self._account.ready().then(function() {

      [
        // @experimental
        'getPeerURI',
        // @experimental
        'connectToPeer'
      ].forEach(function(name) {
        self[name] = self._account[name].bind(self._account);
      });

    });
  }

  Stack.prototype = Object.create(Events.prototype);

  Stack.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
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

  return Stack;

});
