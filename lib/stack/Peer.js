define(function () {
  'use strict';

  /**
   * The representation of a remote peer contact
   * (but not specific to a particular location).
   * This object is responsible for holding the peer files.
   */
  function Peer(context, finder, contact) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._finder = finder;
  	self._contact = contact;

  	self._ready = Q.resolve();

  	self._finder.once("destroy", function() {
  		self._ready = null;
  	});
  }

  Peer.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  Peer.prototype.getContact = function() {
  	return this._contact;
  }

  return Peer;
});
