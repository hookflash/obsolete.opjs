
define([
  'opjs/stack/Publication',
  'opjs-primitives/events',
  'opjs-primitives/util',
  'q/q'
], function (Publication, Events, Util, Q) {
  'use strict';

  function PublicationRepository(context, stack) {
    var self = this;

    (self._context = context).injectLogger(self);

    self._stack = stack;

    self._ready = Q.resolve();

    self._publications = {};

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

  PublicationRepository.prototype.newPublication = function(info) {
  	var publication = new Publication(this._context);
  	if (info.name) {
  		publication.setName(info.name);
  	}
  	return publication;
  }

  PublicationRepository.prototype.publishDoc = function(peer, publication) {
  	this._publications[publication.getName()] = publication;
  	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerCommonProtocol-PeerPublishRequest
	return peer.sendRequest("peer-common", "peer-publish", {
		"document": {
			"details": publication._details,
			"publishToRelationships": publication._publishToRelationships,
			"data": publication._data
		}
	});
  }

  PublicationRepository.prototype.deleteDoc = function(peer, criteria) {
  	if (typeof criteria.name === "undefined") {
  		return Q.reject(new Error("Only 'name' criteria currently supported!"));
  	}
  	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerCommonProtocol-PeerDeleteRequest
  	delete this._publications[criteria.name];
  	return Q.resolve();
  }

  PublicationRepository.prototype.getDoc = function(peer, criteria) {
  	var self = this;
  	if (typeof criteria.name === "undefined") {
  		return Q.reject(new Error("Only 'name' criteria currently supported!"));
  	}
  	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerCommonProtocol-PeerGetRequest
  	var details = {
  		"name": criteria.name,	
		"scope": "location"
  	};
  	[
		"version",
		"lineage",
		"contact",
		"location",
		"chunk"
  	].forEach(function(name) {
  		if (typeof criteria[name] === "undefined") return;
  		details[name] = criteria[name];
  	});
	return peer.sendRequest("peer-common", "peer-get", {
		"document": {
			"details": details
		}
	}).then(function(result) {
		if (!result.document) return null;
	  	var publication = new Publication(self._context);
		publication._details = result.document.details;
		publication._publishToRelationships = result.document.publishToRelationships;
		publication._data = result.document.data;
		return publication;
	});
  }

  PublicationRepository.prototype.processRequest = function(peer, request) {
	if (!request.$handler === "peer-common") {
		return Q.reject(new Error("Handler '" + request.$handler + "' not supported!"));
	}
	if (request.$method === "peer-publish") {
		// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerCommonProtocol-PeerPublishRequest
		return peer.sendResult(request, {
			"document": {
				"details": request.document.details,
				"publishToRelationships": request.document.publishToRelationships
			}
		});
	} else
	if (request.$method === "peer-get") {
		// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerCommonProtocol-PeerGetRequest
		// TODO: Match all criteria.
		var publication = this._publications[request.document.details.name];
		if (publication) {
			return peer.sendResult(request, {
				"document": {
					"details": publication._details,
					"publishToRelationships": publication._publishToRelationships,
					"data": publication._data
				}
			});
		} else {
			// TODO: How do I signal 404?
			return peer.sendResult(request, {
				"document": null
			});
		}
    } else {
      	return Q.reject(new Error("Method '" + request.$method + "' not supported!"));
    }
  }

  return PublicationRepository;
});
