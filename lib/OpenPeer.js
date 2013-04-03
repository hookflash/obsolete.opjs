
define([
  'opjs/Stack'
], function (Stack) {

  /**
   * The Open Peer API entry point for core + stack accessible by clients.
   */
  function OpenPeer(options) {
    var self = this;

  	options = options || {};

  	self._stack = new Stack(options);
  }

  return OpenPeer;

});
