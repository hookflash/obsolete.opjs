
define([
  'q/q'
], function (Q) {

  'use strict';

  /**
   * Load and manage the peer files needed as part of the Open Peer model.
   */
  function PeerFiles(account) {
  	var self = this;

  	// TODO: Initialize peer files. Fetch from lockbox or generate if not found.
  	self._ready = Q.resolve();

  	account.once("destroy", function() {
  		self._ready = null;
  	});
  }

  PeerFiles.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  return PeerFiles;

});
