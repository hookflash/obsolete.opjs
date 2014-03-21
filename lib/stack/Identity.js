/*global $*/
define([
  'opjs-primitives/assert',
  'opjs-primitives/request',
  'opjs-primitives/util',
  'opjs-primitives/crypto',
  'q/q'
], function (Assert, Request, Util, Crypto, Q) {
  'use strict';

  function Identity(context, account) {
    var self = this;

    (self._context = context).injectLogger(self);

    self._account = account;

    self._requestAccess__queue = [];
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
  };

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
  };

  Identity.prototype._requestAccess = function(identity) {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));

    function requestAccess(identity) {

      var deferred = Q.defer();

      return [deferred.promise, function() {

        var processingReady = false;
        function ready() {
          if (processingReady) return;
          processingReady = true;

          self.log("[Identity] Got inner frame ready");

          // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessStartNotification
          // TODO: This should be sent to the inner frame.
          return Request.postNotifyTo(self._context, [event.source, event.origin], "identity", "identity-access-start", {
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
          }).then(deferred.resolve).fail(function(err) {
// TODO: Make sure error appreas in console.
            console.error("err", err);
            return deferred.reject(err);
          });
        }

        self._account.getBootstrapper().getIdentityService("identity-access-inner-frame").then(function(url) {

          // HACK: https://github.com/openpeer/hcs-servers-java/issues/35
          if (!/^https?:\/\//.test(url)) {
            // url = "https://" + url;
            url = "http://" + url;
          }

          self.log("[Identity] Loading inner frame:", url);

          // TODO: Timeout if no ready received.

          window.addEventListener("message", function(event) {
            try {
              var request = null;

              self.log("[window.onmessage]", event.data);

              if (typeof event.data === "string" && event.data.substring(0, 1) === "{") {
                try {
                  request = JSON.parse(event.data).request;
                } catch(err) {}
              }
              if (request) {
                if (request.$handler === "identity") {
                  if (request.$method === "identity-access-window") {

                    Assert.isObject(request.browser);

                    if (request.browser.visibility) {
                      // Show iframe.
                      // TODO: Allow host app to register callback to style and reposition iframe.
                      $("#openpeer-identity-iframe").addClass("openpeer-identity-show");
                    }

                    if (request.browser.ready) {
                      ready();
                    } else {
                      throw new Error("Did not get `ready` back from identity provider inner frame!");
                    }

                    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessWindowRequest
                    event.source.postMessage(JSON.stringify({
                      "result": {
                        "$domain": request.$domain,
                        "$appid": request.$appid,
                        "$id": request.$id,
                        "$handler": request.$handler,
                        "$method": request.$method
                      }
                    }), event.origin);
                  }
                }
              }
            } catch(err) {
              return deferred.reject(err);
            }
          }, false);

          // TODO: Make this more customizable by host app.
          $('body').append('<style>IFRAME.openpeer-identity { display: none; }</style>');
          $('body').append('<style>IFRAME.openpeer-identity-show { display: block; border: 5px solid #000000; position: absolute; top: 50px; left: 25%; width: 50%; height: 400px; }</style>');
          $('body').append('<iframe src="' + url + ('?t=' + Date.now()) + '" id="openpeer-identity-iframe" class="openpeer-identity"></iframe>');

        }).fail(deferred.reject);

        return Q.when(deferred.promise).then(function() {
          $("#openpeer-identity-iframe").remove();
        }).fail(function(err) {
          $("#openpeer-identity-iframe").remove();
          throw err;
        });
      }];
    }

console.error("SCHEDULE QUEUE", self._requestAccess__queue.length);

    var progress = requestAccess(identity);

console.error("ADD TO QUEUE");

    self._requestAccess__queue.push(progress[1]);

    function processQueue() {
console.error("PROCESS QUEUE");
      self._requestAccess__queue[0]().then(function() {

console.error("PROCESS QUEUE DONE");

        self._requestAccess__queue.shift();
        if (self._requestAccess__queue.length > 0) {
          processQueue();
        }
      });
    }

console.error("SCHEDULED QUEUE", self._requestAccess__queue.length);

    if (self._requestAccess__queue.length === 1) {
      processQueue();
    }

    return progress[0];
  };

  Identity.prototype.getSessionInfo = function(identity) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    // TODO: If `this._sessionInfo.accessSecretExpires` has expired, request new access.
    return Q.resolve(this._identities[identity || Object.keys(this._identities)[0]]._sessionInfo);
  };

  Identity.prototype.getRolodexInfo = function(identity) {
    var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    if (self._identities[identity] && self._identities[identity]._rolodexInfo) {
      return Q.resolve(self._identities[identity]._rolodexInfo);
    }
    return self.getSessionInfo(identity).then(function(identitySession) {
      return self._account.getBootstrapper().getIdentityService("identity-access-rolodex-credentials-get").then(function(url) {
        // @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#IdentityServiceRequestsAnnex-IdentityAccessRolodexCredentialsGetRequest
        var clientNonce = Util.randomHex(32);
        var accessSecretProofExpires = Math.floor(Date.now()/1000) + 60;  // 60 seconds.
        var payload = {
          "clientNonce": clientNonce,
          "identity": {
            "accessToken": identitySession.accessToken,
            "accessSecretProof": Crypto.hmac(identitySession.accessSecret,
              "identity-access-validate:" + identitySession.uri + ":" + clientNonce + ":" + accessSecretProofExpires + ":" + identitySession.accessToken + ":rolodex-credentials-get"
            ).toHex(),
            "accessSecretProofExpires": accessSecretProofExpires,
            "uri": identitySession.uri,
            "provider": identitySession.provider
          }
        };
        return Request.makeRequestTo(self._context, url, "identity", "identity-access-rolodex-credentials-get", payload).then(function(result) {

            Assert.isObject(result.rolodex);
            Assert.isString(result.rolodex.serverToken);

            self._identities[identity]._rolodexInfo = result.rolodex;

            return result.rolodex;
        });
      });
    });
  };

  Identity.prototype.getLockboxInfo = function(identity) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._identities[identity || Object.keys(this._identities)[0]]._lockboxInfo;
  };

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
  };

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
  };

  Identity.prototype.lookup = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    if (Object.keys(this._identities).length === 0) {
      return Q.reject(new Error("Cannot lookup own identity. It is unknown."));
    }
    return this.lookupIdentities(Object.keys(this._identities));
  };

  Identity.prototype.lookupIdentities = function(identities) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    var self = this;
    if (!Array.isArray(identities)) {
      identities = [ identities ];
    }
    // TODO: Cache identities and look for update when expired:
    //     http://docs.openpeer.org/OpenPeerProtocolSpecification#IdentityLookupServiceRequests-IdentityLookupCheckRequest
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
  };

  return Identity;
});
