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

    self._identities = {};

    self._readyDeferred = Q.defer();
    self._ready = self._readyDeferred.promise;

  	account.once("destroy", function() {
  		self._ready = null;
  		self._account = null;
      self._identities = null;
  	});
  }

  Identity.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  Identity.prototype.addIdentity = function(identity) {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    if (self._identities[identity]) {
      self.log("[Identity] Identity '" + identity + "' already added");
      return Q.resolve();
    }
    self.log("[Identity] Init identity '" + identity + "'");
    if (Q.isPending(self._ready)) {
      return self._requestAccess(identity).then(self._readyDeferred.resolve, self._readyDeferred.reject);
    } else {
      return self._requestAccess(identity);
    }
  }

  Identity.prototype._requestAccess = function(identity) {
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
          "base": identity || ("identity://" + self._context.domain + "/"),
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

            self._identities[identity] = {
              _sessionInfo: result.identity
            };

            if (typeof result.lockbox !== "undefined") {
              Assert.isString(result.lockbox.domain);
              Assert.isString(result.lockbox.keyIdentityHalf);
              Assert.isBoolean(result.lockbox.reset);

              self._identities[identity]._lockboxInfo = result.lockbox;
            }
        });
    });
  }

  Identity.prototype.getSessionInfo = function(identity) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    // TODO: If `this._sessionInfo.accessSecretExpires` has expired, request new access.
    return Q.resolve(this._identities[identity || Object.keys(this._identities)[0]]._sessionInfo);
  }

  Identity.prototype.getLockboxInfo = function(identity) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._identities[identity || Object.keys(this._identities)[0]]._lockboxInfo;
  }

  Identity.prototype.setLockboxInfo = function(identity, info) {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return self.getSessionInfo(identity).then(function(identitySession) {
      return self._account.getBootstrapper().getIdentityService("identity-access-lockbox-update").then(function(url) {
        // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessLockboxUpdateRequest
        var clientNonce = Util.randomHex(32);
        var accessSecretProofExpires = Math.floor(Date.now()/1000) + 60;  // 60 seconds.
        var payload = {
          "clientNonce": clientNonce,
          "identity": {
            "accessToken": identitySession.accessToken,
            "accessSecretProof": Crypto.hmac(identitySession.accessSecret,
              "identity-access-validate:" + identitySession.uri + ":" + clientNonce + ":" + accessSecretProofExpires + ":" + identitySession.accessToken + ":lockbox-update"
            ).toHex(),
            "accessSecretProofExpires": accessSecretProofExpires,
            "uri": identitySession.uri,
            "provider": identitySession.provider
          },
          "lockbox": info
        };
        return Request.makeRequestTo(self._context, url, "identity", "identity-access-lockbox-update", payload);
      });
    });
  }

  Identity.prototype.setPublicPeerFile = function(identity, publicPeerFile) {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return self.getSessionInfo(identity).then(function(identitySession) {
      return self._account.getBootstrapper().getIdentityService("identity-lookup-update").then(function(url) {
        // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityLookupUpdateRequest
        var clientNonce = Util.randomHex(32);
        var accessSecretProofExpires = Math.floor(Date.now()/1000) + 60;  // 60 seconds.
        var payload = {
          "clientNonce": clientNonce,
          "identity": {
            "accessToken": identitySession.accessToken,
            "accessSecretProof": Crypto.hmac(identitySession.accessSecret,
              "identity-access-validate:" + identitySession.uri + ":" + clientNonce + ":" + accessSecretProofExpires + ":" + identitySession.accessToken + ":identity-lookup-update"
            ).toHex(),
            "accessSecretProofExpires": accessSecretProofExpires,
            "uri": identitySession.uri,
            "provider": identitySession.provider,
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
   	if (Object.keys(this._identities).length === 0) {
   		return Q.reject(new Error("Cannot lookup own identity. It is unknown."));
   	}
   	return this.lookupIdentities(Object.keys(this._identities));
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
