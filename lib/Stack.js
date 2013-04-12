
define([
  'opjs/shims',
  'opjs/stack/Bootstrapper',
  'opjs/stack/Account',
  'opjs/request',
  'opjs/util',
  'opjs/events',
  'opjs/assert',
  'q/q',
], function (Shims, Bootstrapper, Account, Request, Util, Events, Assert, Q) {

  /**
   * Initialization object for the stack layer.
   */
  function Stack(options) {
  	var self = this;

    options = options || {};

    self._appID = options.appID || Util.randomHex(32);
    self._locationID = options.locationID || Util.randomHex(32);
    self._deviceID = Util.getDeviceID();
    self._ip = Util.getIP();
    self._os = Util.getOS();
    self._system = Util.getSystem();
    self._userAgent = Util.getUserAgent();
    self._identityID = options.identityID || ("identity://" + (options.domain || Util.getHost()) + "/" + Util.randomHex(32));

    Request.setContext({
      "appid": self._appID
    });

    // First we initialize the `Bootstrapper` and wait until it is ready.

    self._bootstrapper = new Bootstrapper(self, self._identityID);

    self._ready = self._bootstrapper.ready().then(function() {

      self._account = new Account(self);

      return self._account.ready().then(function() {

        [
          // @experimental
          'getPeerURI',
          // @experimental
          'connectToPeer'
        ].forEach(function(name) {
          self[name] = self._account[name].bind(self._account);
        });

      });
    });
  }

  Stack.prototype = Object.create(Events.prototype);

  Stack.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
  }

  Stack.prototype.getBootstrapper = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._bootstrapper;
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
