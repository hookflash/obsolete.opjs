
define([
  'opjs/assert',
  'opjs/request',
  'opjs/util',
  'opjs/crypto',
  'q/q'
], function (Assert, Request, Util, Crypto, Q) {

  // Import globals
  var WINDOW = window;

  var NAMESPACES = {
    "private-peer-file": "https://meta.openpeer.org/ns/private-peer-file"
  };

  function Lockbox(context, account) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._account = account;

    self._sessionInfo = null;
    self._namespaces = [];
    self._identities = null;
    self._content = {};

    self._ready = Q.resolve();

    self._readyDeferred = Q.defer();
  	self._ready = self._readyDeferred.promise;

  	account.once("destroy", function() {
  		self._ready = null;
      self._account = null;
      self._sessionInfo = null;
      self._namespaces = null;
      self._identities = null;
      self._content = null;
  	});
  }

  Lockbox.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  Lockbox.prototype._getGrantId = function() {
    if (this._ready === null) throw new Error("Object has been destroyed");
    if (typeof WINDOW.localStorage === "undefined") {
      self.warn("Cannot keep lockbox grant ID for longer than this page session as HTML5 Local Storage not available!");
      // TODO: Could keep it in a long-lasting cookie or other more platform specific storage mechanism.
    }
    var key = "openpeer.lockbox.grantId";
    // TODO: Encrypt grant ID with private peer file secret.
    if (!WINDOW.localStorage[key]) {
      WINDOW.localStorage[key] = Util.randomHex(32);
    }
    return WINDOW.localStorage[key];
  }

  Lockbox.prototype.getIdentityCredentials = function() {
    if (this._ready === null) throw new Error("Object has been destroyed");
    if (!this._sessionInfo) throw new Error("Lockbox session not initialized");
    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessLockboxUpdateRequest
    return  {
      domain: this._sessionInfo.domain,
      // TODO: Don't send the lockbox half here and send the proper key half instead.
      keyIdentityHalf: this._sessionInfo.keyLockboxHalf
    };
  }

  Lockbox.prototype.requestAccess = function(identity) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    var self = this;
    return self._account.getBootstrapper().getLockboxService("lockbox-access").then(function(url) {
      return self._account._identity.getSessionInfo(identity).then(function(identitySession) {
        // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxAccessRequest
        var clientNonce = Util.randomHex(32);
        var accessSecretProofExpires = Math.floor(Date.now()/1000) + 60;  // 60 seconds.
        var payload = {
          "clientNonce": clientNonce,
          "identity": {
            "accessToken": identitySession.accessToken,
            "accessSecretProof": Crypto.hmac(identitySession.accessSecret,
              "identity-access-validate:" + identitySession.uri + ":" + clientNonce + ":" + accessSecretProofExpires + ":" + identitySession.accessToken + ":lockbox-access"
            ).toHex(),
            "accessSecretProofExpires": accessSecretProofExpires,
            "uri": identitySession.uri,
            "provider": identitySession.provider
          },
          "grant": {
            "$id": self._getGrantId()
          },
          "agent": {
            "userAgent": self._context.agentProduct,
            "name": self._context.agentName,
            "image": self._context.agentImage,
            "url": self._context.agentUrl
          },
          "lockbox": {
            "domain": self._context.domain
            // TODO: Send these properties if we can. See: `self._account._identity.getLockboxInfo()`
            //"keyLockboxHalf": "Wm1SellXWmtabVJoWm1wcmFuSmlhMnB5WW1WbWEycHlaV3ByY21ZPQ==",
            //"hash": "cf69f9e4ed98bb739b4c72fc4fff403467014874"
          }
        };
        return Request.makeRequestTo(self._context, url, "lockbox", "lockbox-access", payload).then(function(result) {
          Assert.isObject(result.lockbox);
          Assert.isString(result.lockbox.$id);
          Assert.isString(result.lockbox.accessToken);
          Assert.isString(result.lockbox.accessSecret);
          Assert.isNumber(result.lockbox.accessSecretExpires);
          Assert.isString(result.lockbox.domain);
          Assert.isString(result.lockbox.keyLockboxHalf);
          Assert.isObject(result.grant);
          Assert.equal(result.grant.$id, self._getGrantId());
          Assert.notEqual(typeof result.identities.identity, "undefined");

          self._sessionInfo = result.lockbox;
          self._sessionInfo.grantId = self._getGrantId();
          self._namespaces = (result.grant && result.grant.namespaces && Util.arrayForPayloadObject(result.grant.namespaces.namespace)).map(function(namespace) {
            return namespace.$id;
          }) || [];
          self._identities = Util.arrayForPayloadObject(result.identities.identity);
        });
      });
    }).then(self._readyDeferred.resolve, self._readyDeferred.reject);
  }

  Lockbox.prototype.updateAccess = function(identity) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    var self = this;

    Assert.isArray(self._identities);
    if (self._identities.filter(function(info) {
      return (info.uri === identity);
    }).length >= 1) return Q.resolve();
    return self._account.getBootstrapper().getLockboxService("lockbox-identities-update").then(function(url) {
      return self._account._identity.getSessionInfo(identity).then(function(identitySession) {

        var identityParts = Util.parseIdentityURI(identity);

        // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxIdentitiesUpdateRequest
        var clientNonce = Util.randomHex(32);
        var accessSecretProofExpires = Math.floor(Date.now()/1000) + 60;  // 60 seconds.
        var payload = {
          "clientNonce": clientNonce,
          "lockbox": {
            "accessToken": self._sessionInfo.accessToken,
            "accessSecretProof": Crypto.hmac(self._sessionInfo.accessSecret,
              "lockbox-access-validate:" + clientNonce + ":" + accessSecretProofExpires + ":" + self._sessionInfo.accessToken + ":lockbox-identities-update"
            ).toHex(),
            "accessSecretProofExpires": accessSecretProofExpires,
          },
          "identities": {
            "identity": [
              {
                "$disposition": "update",
                "accessToken": identitySession.accessToken,
                "accessSecretProof": Crypto.hmac(identitySession.accessSecret,
                  "identity-access-validate:" + identitySession.uri + ":" + clientNonce + ":" + accessSecretProofExpires + ":" + identitySession.accessToken + ":lockbox-access-update"
                ).toHex(),
                "accessSecretProofExpires": accessSecretProofExpires,
                "uri": identity,
                "provider": identityParts.domain
              }
            ]
          }
        };
        return Request.makeRequestTo(self._context, url, "lockbox", "lockbox-identities-update", payload).then(function(result) {

          Assert.notEqual(typeof result.identities.identity, "undefined");

          self._identities = Util.arrayForPayloadObject(result.identities.identity);
        });
      });
    });
  }


  Lockbox.prototype.getSessionInfo = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    // TODO: If expired, get new access.
    return Q.resolve(this._sessionInfo);
  }

  Lockbox.prototype.getPrivatePeerFile = function() {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    var nsAlias = "private-peer-file";
    var nsUri = NAMESPACES[nsAlias];
    if (self._namespaces.indexOf(nsUri) === -1) {
      return Q.reject(new Error("No access to namespace '" + nsUri + "'"));
    }
    if (self._content[nsAlias]) {
      return Q.resolve(self._content[nsAlias]);
    }
    return self._account.getBootstrapper().getLockboxService("lockbox-content-get").then(function(url) {
      return self.getSessionInfo().then(function(lockbox) {
        // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxContentGetRequest
        var clientNonce = Util.randomHex(32);
        var accessSecretProofExpires = Math.floor(Date.now()/1000) + 60;  // 60 seconds.
        var payload = {
          "clientNonce": clientNonce,
          "lockbox": {
            "accessToken": lockbox.accessToken,
            "accessSecretProof": Crypto.hmac(lockbox.accessSecret,
              "lockbox-access-validate:" + clientNonce + ":" + accessSecretProofExpires + ":" + lockbox.accessToken + ":lockbox-get"
            ).toHex(),
            "accessSecretProofExpires": accessSecretProofExpires
          },
          "grant": {
            "$id": lockbox.grantId,
            "namespaces":{
              "namespace": [
                {
                  "$id": nsUri
                }
              ]
            }
          }
        };
        return Request.makeRequestTo(self._context, url, "lockbox", "lockbox-content-get", payload).then(function(result) {
          Assert.isObject(result.grant);
          Assert.equal(result.grant.$id, lockbox.grantId);
          var privatePeerFile = null;
          Util.arrayForPayloadObject((result.grant.namespaces && result.grant.namespaces.namespace) || []).forEach(function(namespace) {
            Assert.isString(namespace.$id);
            if (namespace.$id === nsUri) {
              privatePeerFile = JSON.parse(Crypto.decryptWithString(
                Crypto.hmac(
                  // TODO: Use lockbox key instead of grant ID
                  lockbox.grantId,
                  "lockbox:" + nsUri + ":" + "value"
                ).toHex(),
                Crypto.iv(nsUri + ":" + "value"),
                namespace.value
              ));
            }
          });
          return privatePeerFile;
        });
      });
    });
  }

  Lockbox.prototype.setPrivatePeerFile = function(privatePeerFile) {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    var nsAlias = "private-peer-file";
    var nsUri = NAMESPACES[nsAlias];
    if (self._namespaces.indexOf(nsUri) === -1) {
      return Q.reject(new Error("No access to namespace '" + nsUri + "'"));
    }
    if (self._content[nsAlias]) {
      return Q.resolve(self._content[nsAlias]);
    }
    return self._account.getBootstrapper().getLockboxService("lockbox-content-set").then(function(url) {
      return self.getSessionInfo().then(function(lockbox) {
        // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxContentSetRequest
        var clientNonce = Util.randomHex(32);
        var accessSecretProofExpires = Math.floor(Date.now()/1000) + 60;  // 60 seconds.
        var payload = {
          "clientNonce": clientNonce,
          "lockbox": {
            "accessToken": lockbox.accessToken,
            "accessSecretProof": Crypto.hmac(lockbox.accessSecret,
              "lockbox-access-validate:" + clientNonce + ":" + accessSecretProofExpires + ":" + lockbox.accessToken + ":lockbox-set"
            ).toHex(),
            "accessSecretProofExpires": accessSecretProofExpires
          },
          "grant": {
            "$id": lockbox.grantId,
            "namespaces":{
              "namespace": [
                {
                  "$id": nsUri,
                  "value": Crypto.encryptWithString(
                    Crypto.hmac(
                      // TODO: Use lockbox key instead of grant ID
                      lockbox.grantId,
                      "lockbox:" + nsUri + ":" + "value"
                    ).toHex(),
                    Crypto.iv(nsUri + ":" + "value"),
                    JSON.stringify(privatePeerFile)
                  )
                }
              ]
            }
          }
        };
        return Request.makeRequestTo(self._context, url, "lockbox", "lockbox-content-set", payload);
      });
    });
  }

  return Lockbox;

});
