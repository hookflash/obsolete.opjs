
define([
  'opjs/stack/account',
  'opjs/stack/util',
  'opjs/events',
  'q/q',
], function (Account, Util, Events, Q) {

  /**
   * Initialization object for the stack layer.
   */
  function Stack(options) {
  	var self = this;

  	self._deviceID = options.deviceID || Util.randomHex(32);
  	self._userAgent = options.userAgent || navigator.userAgent;
  	delete options.userAgent;

    options.deviceID = self._deviceID;

  	self._account = new Account(options);

    [
      'getPeerURI',
      'connectToPeer'
    ].forEach(function(name) {
      self[name] = self._account[name].bind(self._account);
    });

    // TODO: Wait for connection (can remove `setTimeout` once we do that)
    self._ready = Q.resolve();
  }

//  Stack.prototype = new Events();

  Stack.prototype.ready = function() {
    return this._ready;
  }

  Stack.prototype.destroy = function() {

  	// TODO: Disconnect and destroy stack. No futher calls to stack possible.

  	return Q.resolve();
  }

  return Stack;

});
