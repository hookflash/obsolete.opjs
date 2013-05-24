define([
  'opjs/assert',
  'opjs/request',
  'opjs/util',
  'opjs/crypto',
  'q/q'
], function (Assert, Request, Util, Crypto, Q) {
  'use strict';

  function Identity(context, account) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._account = account;

    self._sessionInfo = null;
    self._lockboxInfo = null;

    // TODO: Initialize our identity in some way?
  	self._ready = self._requestAccess();

  	account.once("destroy", function() {
  		self._ready = null;
  		self._account = null;
      self._sessionInfo = null;
      self._lockboxInfo = null;
  	});
  }

  Identity.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  Identity.prototype._requestAccess = function() {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return self._account.getBootstrapper().getIdentityService("identity-access-start").then(function(url) {
      // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessStartNotification
      // TODO: This should be sent to the inner frame.
      return Request.makeRequestTo(self._context, url, "identity", "identity-access-start", {
        "agent": {
          "userAgent": self._context.agentProduct,
          "name": self._context.agentName,
          "image": self._context.agentImage,
          "url": self._context.agentUrl
        },
        "identity": {
          "base": self._context.identity || ("identity://" + self._context.domain + "/"),
          // TODO: Support `reloginKey`.
          //"reloginKey": "d2922f33a804c5f164a55210fe193327de7b2449-5007999b7734560b2c23fe81171af3e3-4c216c23"
        },
        "browser": {
          "visibility": "visible-on-demand",
          "popup": "allow",
          "outerFrameURL": Util.getAppURL()
        }
      }).then(function(result) {
            // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessCompleteNotification
            // TODO: This should come back from the inner frame.
            Assert.isObject(result.identity);
            Assert.isString(result.identity.accessToken);
            Assert.isString(result.identity.accessSecret);
            Assert.isNumber(result.identity.accessSecretExpires);
            Assert.isString(result.identity.uri);
            Assert.isString(result.identity.provider);

            self._sessionInfo = result.identity;

            if (typeof result.lockbox !== "undefined") {
              Assert.isString(result.lockbox.domain);
              Assert.isString(result.lockbox.keyIdentityHalf);
              Assert.isBoolean(result.lockbox.reset);

              self._lockboxInfo = result.lockbox;
            }
        });
    });
  }

  Identity.prototype.getSessionInfo = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    // TODO: If `this._sessionInfo.accessSecretExpires` has expired, request new access.
    return Q.resolve(this._sessionInfo);
  }

  Identity.prototype.getLockboxInfo = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._lockboxInfo;
  }

  Identity.prototype.setPublicPeerFile = function(publicPeerFile) {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return self.getSessionInfo().then(function(identity) {
      return self._account.getBootstrapper().getIdentityService("identity-lookup-update").then(function(url) {
        // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityLookupUpdateRequest
        var clientNonce = Util.randomHex(32);
        var accessSecretProofExpires = Math.floor(Date.now()/1000) + 60;  // 60 seconds.
        var payload = {
          "clientNonce": clientNonce,
          "identity": {
            "accessToken": identity.accessToken,
            "accessSecretProof": Crypto.hmac(identity.accessSecret,
              "identity-access-validate:" + identity.uri + ":" + clientNonce + ":" + accessSecretProofExpires + ":" + identity.accessToken + ":identity-lookup-update"
            ).toHex(),
            "accessSecretProofExpires": accessSecretProofExpires,
            "uri": identity.uri,
            "provider": identity.provider,
            "stableID": Crypto.parsePublicPeerFile(publicPeerFile).contact,
            "peer": publicPeerFile.peer,
            "priority": 5,
            "weight": 1
          }
        };
        return Request.makeRequestTo(self._context, url, "identity", "identity-lookup-update", payload);
      });
    });
  }

  Identity.prototype.lookup = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
   	var self = this;
   	if (!self._context.identity) {
   		return Q.reject(new Error("Cannot lookup own identity. It is unknown."));
   	}
   	return self.lookupIdentities(self._context.identity);
  }

  Identity.prototype.lookupIdentities = function(identities) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	var self = this;
  	if (!Array.isArray(identities)) {
  		identities = [ identities ];
  	}
  	// TODO: Cache identities and look for update when expired:
  	//		 http://docs.openpeer.org/OpenPeerProtocolSpecification#IdentityLookupServiceRequests-IdentityLookupCheckRequest
  	return self._account.getBootstrapper().getIdentityService("identity-lookup").then(function(url) {
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
  	        Assert.isObject(result.identities);
  	        Assert.notEqual(typeof result.identities.identity, "undefined");
            return Util.arrayForPayloadObject(result.identities.identity);
  	  	});
  	});
  }

  return Identity;
});
