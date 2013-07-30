
define([
  'opjs/assert',
  'opjs/request',
  'opjs/util',
  'opjs/crypto',
  'opjs/indexdb',
  'q/q'
], function (Assert, Request, Util, Crypto, INDEXDB, Q) {

  function Contact(context, core) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._core = core;

    self._sessionInfo = {};

    self._readyDeferred = Q.defer();
    self._ready = self._readyDeferred.promise;
    self._ready = self._ready.then(function() {
      self._cache = new ContactCache(self._context);
      return self._cache._ready;
    });

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

            // TODO: Keep track of `result.rolodex.updateNext`.

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

          // TODO: Keep track of `result.rolodex.updateNext`.

          var clearContacts = (!!result.rolodex.version);

          return self._cache.sync(Util.arrayForPayloadObject(result.identities.identity), clearContacts);
        });
      });
    });
  }

  function ContactCache(context) {
    var self = this;
    (self._context = context).injectLogger(self);
    self._dbName = "openpeer-contacts";
    self._tableName = "contacts";
    var deferred = Q.defer();
    // @see https://github.com/axemclion/jquery-indexeddb/blob/gh-pages/docs/README.md
    var db = INDEXDB(self._dbName, { 
        "version" : 1,
        "upgrade" : function(transaction){
        },
        "schema" : {
            "1" : function(transaction) {
              var contactsStore = transaction.createObjectStore(self._tableName, {
                  "autoIncrement": false,
                  "keyPath": "uri"
              });
            }
        }
    });
    db.fail(function(err, event) {
      return deferred.reject(err);
    });
    db.done(function(db, event) {
      return deferred.resolve();
    });
    self._ready = deferred.promise;
  }

  ContactCache.prototype.sync = function(contacts, clear) {
    var self = this;
    if (clear !== true) clear = false;
    return self._ready.then(function() {
      function insertOrRemove() {
        var deferred = Q.defer();
        var transaction = INDEXDB(self._dbName).transaction(self._tableName);
        transaction.fail(function(event) {
          self.error(event);
          return deferred.reject(new Error("Transaction failed due to: " + event.type));
        });
        transaction.done(function(event) {
          return deferred.resolve();
        });
        transaction.progress(function(transaction) {
          var contactsStore = transaction.objectStore(self._tableName);
          contacts.forEach(function(contact) {
            if (contact.$disposition === "update") {
              delete contact.$disposition;
              contactsStore.put(contact);
            } else
            if (contact.$disposition === "remove") {
              contactsStore.delete(contact.uri);
            } else {
              self.error(new Error("unrecognized disposition: '" + contact.$disposition + "'").stack);
            }
          });
        });
        return deferred.promise;
      }
      if (clear === true) {
        var deferred = Q.defer();
        INDEXDB(self._dbName).objectStore(self._tableName).clear().done(function() {
          insertOrRemove().then(deferred.resolve).fail(deferred.reject);
        }).fail(deferred.reject);
        return deferred.promise;
      } else {
        return insertOrRemove();
      }
    });
  }

  return Contact;

});
