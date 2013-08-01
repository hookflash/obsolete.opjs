
define([
  'opjs/stack/Publication',
  'opjs/events',
  'opjs/util'
], function (Publication, Events, Util) {
  'use strict';

  function PublicationRepository(context, stack) {
    var self = this;

    (self._context = context).injectLogger(self);

    self._stack = stack;

    self._ready = Q.resolve();

    self._stack.once("destroy", function() {
      self._ready = null;
      self.emit("destroy");
      self._stack = null;
    });
  }

  PublicationRepository.prototype = Object.create(Events.prototype);

  PublicationRepository.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
  }

  PublicationRepository.prototype.newPublication = function() {
  	return new Publication(this._context);
  }

  PublicationRepository.prototype.publish = function(peer, publication) {
  	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerCommonProtocol-PeerPublishRequest
	return peer.sendRequest("peer-common", "peer-publish", {
		"document": {
			"details": publication._details,
			"publishToRelationships": publication._publishToRelationships,
			"data": publication._data
		}
	});
  }

  PublicationRepository.prototype.processRequest = function(peer, request) {
      if (request.$handler === "peer-common" && request.$method === "peer-publish") {
		// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerCommonProtocol-PeerPublishRequest
		return peer.sendResult(request, {
			"document": {
				"details": request.document.details,
				"publishToRelationships": request.document.publishToRelationships
			}
		});
      } else {
      	return Q.reject(new Error("Handler '" + request.$handler + "' with method '" + request.$method + "' not supported!"));
      }
  }

  return PublicationRepository;
});
