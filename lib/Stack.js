
define([
  'opjs/stack/Bootstrapper',
  'opjs/stack/Account',
  'opjs/util',
  'opjs/events',
  'opjs/assert',
  'q/q',
], function (Bootstrapper, Account, Util, Events, Assert, Q) {

  /**
   * Initialization object for the stack layer.
   */
  function Stack(options) {
  	var self = this;

    options = options || {};

    if (typeof options.identityID === "undefined") {
      if (typeof options.domain === "undefined") {
        options.domain = Util.getHost();
      }
      options.identityID = "identity://" + options.domain + "/" + Util.randomHex(32);
      delete options.domain;
    }
    if (typeof options.deviceID === "undefined") {
      options.deviceID = Util.randomHex(32);
    }

    Assert(typeof options.identityID === "string", "`options.identityID` must be a string");
    Assert(typeof options.deviceID === "string", "`options.deviceID` must be a string");

    self._identityID = options.identityID;
    // @experimental: Not sure if we should hold it here. Probably in location object instead.
  	self._deviceID = options.deviceID;
    // @experimental: Not sure if we should hold it here. Probably in location object instead.
  	self._userAgent = options.userAgent || Util.getUserAgent();

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
