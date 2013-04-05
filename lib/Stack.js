
define([
  'opjs/stack/Bootstrapper',
  'opjs/stack/Lockbox',
  'opjs/stack/PeerFiles',
  'opjs/stack/Account',
  'opjs/util',
  'opjs/events',
  'opjs/assert',
  'q/q',
], function (Bootstrapper, Lockbox, PeerFiles, Account, Util, Events, Assert, Q) {

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
  	self._deviceID = options.deviceID;
  	self._userAgent = options.userAgent || Util.getUserAgent();

    // First we initialize the `Bootstrapper` and wait until it is ready.

    self._bootstrapper = new Bootstrapper(self, self._identityID);

    self._ready = self._bootstrapper.ready().then(function() {

      // Next we initialize our `Lockbox` and wait until they are ready.

      self._lockbox = new Lockbox(self);

      return self._lockbox.ready().then(function() {

        // Next we initialize our `PeerFiles` and wait until they are ready.

        self._peerFiles = new PeerFiles(self);

        return self._peerFiles.ready().then(function() {

          // Finally we initialize our `Account` and wait until it is ready.

          // TODO: Don't pass `options`. Pass `self` instead.
          self._account = new Account(options);

          [
            'getPeerURI',
            'connectToPeer'
          ].forEach(function(name) {
            self[name] = self._account[name].bind(self._account);
          });

        });
      });
    });
  }

  Stack.prototype = new Events();

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
