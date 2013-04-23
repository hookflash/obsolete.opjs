define([
  'opjs/assert',
  'opjs/request',
  'opjs/util',
  'q/q'
], function (Assert, Request, Util, Q) {
  'use strict';

  function Identity(context, account) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._account = account;

    // TODO: Initialize our identity in some way?
  	self._ready = Q.resolve();

  	account.once("destroy", function() {
  		self._ready = null;
  		self._account = null;
  	});
  }

  Identity.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  Identity.prototype.lookup = function() {
 	var self = this;
 	if (!self._context.identity) {
 		return Q.reject(new Error("Cannot lookup own identity. It is unknown."));
 	}
 	return self.lookupIdentities(self._context.identity);
  }

  Identity.prototype.lookupIdentities = function(identities) {
  	var self = this;
  	if (!Array.isArray(identities)) {
  		identities = [ identities ];
  	}
  	// TODO: Cache identities and look for update when expired:
  	//		 http://docs.openpeer.org/OpenPeerProtocolSpecification#IdentityLookupServiceRequests-IdentityLookupCheckRequest
	return self._account.getBootstrapper().getIdentityLookupService().then(function(url) {
		var providers = {};
		identities.forEach(function(identity) {
			var identityParts = Util.parseIdentityURI(identity);
			if (!providers[identityParts.domain]) {
				providers[identityParts.domain] = {};
			}
			providers[identityParts.domain][identityParts.identity] = true;
		});
		var provider = [];
		for (var domain in providers) {
			provider.push({
				"base": "identity://" + domain + "/",
				"separator": ",",
				"identities": Object.keys(providers[domain]).join(",")
			});
		}
		if (provider.length === 0) provider = provider[0];
		// @see http://docs.openpeer.org/OpenPeerProtocolSpecification#IdentityLookupServiceRequests-IdentityLookupRequest
		return Request.makeRequestTo(self._context, url, "identity-lookup", "identity-lookup", {
			"providers": {
				"provider": provider
			}
		}).then(function(result) {
	        Assert.equal(typeof result.identities, "object");
	        Assert.notEqual(typeof result.identities.identity, "undefined");
	        if (!Array.isArray(result.identities.identity)) {
	        	return [ result.identities.identity ];
	        }
        	return result.identities.identity;
	  	});
	});
  }

  return Identity;
});
