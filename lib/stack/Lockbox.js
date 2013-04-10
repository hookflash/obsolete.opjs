
define([
  'q/q'
], function (Q) {

  'use strict';

  function Lockbox(account) {
  	var self = this;

  	// TODO: Initialize lockbox.
  	self._ready = Q.resolve();

  	account.once("destroy", function() {
  		self._ready = null;
  	});
  }

  Lockbox.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  return Lockbox;

});
