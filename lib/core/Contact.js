
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

        return self._core._stack._account._identity.getRolodexInfo(identity).then(function(rolodexInfo) {

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
              "serverToken": rolodexInfo.serverToken,
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
                      "serverToken": rolodexInfo.serverToken,                    
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
      });
    }).then(self._readyDeferred.resolve, self._readyDeferred.reject);
  }

  Contact.prototype.ensureContacts = function(identity) {
    var self = this;
    return self._core._stack._account._identity.getRolodexInfo(identity).then(function(rolodexInfo) {
      return self._core._stack._account.getBootstrapper().getRolodexService("rolodex-contacts-get").then(function(url) {
        // @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#RolodexServiceRequests-RolodexContactsGetRequest
        var clientNonce = Util.randomHex(32);
        var accessSecretProofExpires = Math.floor(Date.now()/1000) + 60;  // 60 seconds.
        var payload = {
          "clientNonce": clientNonce,
          "rolodex": {
            "serverToken": rolodexInfo.serverToken,                    
            "accessToken": self._sessionInfo[identity].accessToken,
            "accessSecretProof": Crypto.hmac(self._sessionInfo[identity].accessSecret,
              "rolodex-access-validate:" + clientNonce + ":" + accessSecretProofExpires + ":" + self._sessionInfo[identity].accessToken + ":rolodex-contacts-get"
            ).toHex(),
            "accessSecretProofExpires": accessSecretProofExpires,
            //"version": self._getLatestVersion(),
            "refresh": false
          }
        };
        return Request.makeRequestTo(self._context, url, "rolodex", "rolodex-contacts-get", payload).then(function(result) {

          Assert.isObject(result.rolodex);
          Assert.isNumber(result.rolodex.updateNext);
          Assert.isString(result.rolodex.version);
          Assert.isObject(result.identities);
          Assert.notEqual(typeof result.identities.identity, "undefined");

          Util.arrayForPayloadObject(result.identities.identity).forEach(function(identity) {

console.error("identity", identity);
          });
        });
      });
    });
  }

  return Contact;

});
