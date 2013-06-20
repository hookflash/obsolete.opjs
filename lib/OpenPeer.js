
define([
  'opjs/Stack',
  'opjs/Core'
], function (Stack, Core) {

  /**
   * The Open Peer API entry point for core + stack accessible by clients.
   */
  function OpenPeer(options) {
    var self = this;

  	options = options || {};

  	self._stack = new Stack(options);

    self._core = new Core(self._stack._context, self._stack);

    self._ready = self._stack.ready();
  }

  OpenPeer.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
  }

  OpenPeer.prototype.destroy = function() {
    return this._stack.destroy();
  }

  return OpenPeer;

});
