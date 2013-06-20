
define([
  'opjs/assert',
  'opjs/request',
  'opjs/util',
  'opjs/crypto',
  'q/q'
], function (Assert, Request, Util, Crypto, Q) {

  function Contact(context, core) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._core = core;

    self._sessionInfo = {};

    self._readyDeferred = Q.defer();
    self._ready = self._readyDeferred.promise;

  	self._core.once("destroy", function() {
  		self._ready = null;
      self._core = null;
      self._sessionInfo = {};
  	});
  }

  Contact.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  Contact.prototype._getLatestVersion = function() {
    // TODO: Keep latest version in IndexDB.
    return "";
  }

  Contact.prototype.requestAccess = function(identity) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    var self = this;
    return self._core._stack._account.getBootstrapper().getRolodexService("rolodex-access").then(function(url) {

      return self._core._stack._account._identity.getSessionInfo(identity).then(function(identitySession) {
        // @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#RolodexServiceRequests-RolodexAccessRequest
        var clientNonce = Util.randomHex(32);
        var accessSecretProofExpires = Math.floor(Date.now()/1000) + 60;  // 60 seconds.
        var namespaces = [];
        var payload = {
          "clientNonce": clientNonce,
          "identity": {
            "accessToken": identitySession.accessToken,
            "accessSecretProof": Crypto.hmac(identitySession.accessSecret,
              "identity-access-validate:" + identitySession.uri + ":" + clientNonce + ":" + accessSecretProofExpires + ":" + identitySession.accessToken + ":rolodex-access"
            ).toHex(),
            "accessSecretProofExpires": accessSecretProofExpires,
            "uri": identitySession.uri,
            "provider": identitySession.provider
          },
          "rolodex": {
            // TODO: Get token from identity service.
            "serverToken": "b3ff46bae8cacd1e572ee5e158bcb04ed9297f20-9619e3bc-4cd41c9c64ab2ed2a03b45ace82c546d",
            //"version": self._getLatestVersion(),
            "refresh": false
          },
          "agent": {
            "userAgent": self._context.agentProduct,
            "name": self._context.agentName,
            "image": self._context.agentImage,
            "url": self._context.agentUrl
          },
          "grant": {
            "$id": self._core._stack._account._namespaceGrant.getGrantId()
          },
        };
        return Request.makeRequestTo(self._context, url, "rolodex", "rolodex-access", payload).then(function(result) {

          Assert.isObject(result.rolodex);
          Assert.isString(result.rolodex.accessToken);
          Assert.isString(result.rolodex.accessSecret);
          Assert.isNumber(result.rolodex.accessSecretExpires);
          Assert.isNumber(result.rolodex.updateNext);

          self._sessionInfo[identity] = result.rolodex;
          self._sessionInfo[identity].grantId = self._core._stack._account._namespaceGrant.getGrantId();

          if (result.namespaceGrantChallenge) {
            return self._core._stack._account._namespaceGrant.signChallenge(result.namespaceGrantChallenge, namespaces).then(function(signedChallenge) {

              return self._core._stack._account.getBootstrapper().getRolodexService("rolodex-namespace-grant-challenge-validate").then(function(url) {
                // @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#RolodexServiceRequests-RolodexNamespaceGrantChallengeValidateRequest
                var clientNonce = Util.randomHex(32);
                var accessSecretProofExpires = Math.floor(Date.now()/1000) + 60;  // 60 seconds.
                var payload = {
                  "clientNonce": clientNonce,
                  "rolodex": {
                    // TODO: Get token from identity service.
                    "serverToken": "b3ff46bae8cacd1e572ee5e158bcb04ed9297f20-9619e3bc-4cd41c9c64ab2ed2a03b45ace82c546d",                    
                    "accessToken": self._sessionInfo[identity].accessToken,
                    "accessSecretProof": Crypto.hmac(self._sessionInfo[identity].accessSecret,
                      "rolodex-access-validate:" + clientNonce + ":" + accessSecretProofExpires + ":" + self._sessionInfo[identity].accessToken + ":rolodex-namespace-grant-challenge-validate"
                    ).toHex(),
                    "accessSecretProofExpires": accessSecretProofExpires,
                  },
                  "namespaceGrantChallengeBundle": signedChallenge
                };
                return Request.makeRequestTo(self._context, url, "rolodex", "rolodex-namespace-grant-challenge-validate", payload);
              });
            });
          }
        });
      });
    }).then(self._readyDeferred.resolve, self._readyDeferred.reject);
  }

  return Contact;

});
