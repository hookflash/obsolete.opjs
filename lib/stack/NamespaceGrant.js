
define([
  'opjs/assert',
  'opjs/request',
  'opjs/util',
  'opjs/crypto',
  'q/q'
], function (Assert, Request, Util, Crypto, Q) {

  function NamespaceGrant(context, account) {
  	var self = this;

    (self._context = context).injectLogger(self);

    self._account = account;

    self._ready = Q.resolve();

  	account.once("destroy", function() {
  		self._ready = null;
      self._account = null;
  	});
  }

  NamespaceGrant.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  NamespaceGrant.prototype.signChallenge = function(challenge, namespaces) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    var self = this;

    return self._account.getBootstrapper().getNamespaceGrantService("namespace-grant-start").then(function(url) {

      challenge.namespaces = {
        namespace: namespaces.map(function(id) {
          return {
            "$id": id
          };
        })
      };

      // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#NamespaceGrantServiceRequests-NamespaceGrantStartNotification
      var payload = {
        "agent": {
          "userAgent": self._context.agentProduct,
          "name": self._context.agentName,
          "image": self._context.agentImage,
          "url": self._context.agentUrl
        },
        "namespaceGrantChallenges": {
          "namespaceGrantChallenge": [
            challenge
          ]
        },
        "browser": {
          "visibility": "visible-on-demand",
          "popup": "deny",
          // TODO: Get this from context.
          "outerFrameURL": ""
        }
      };
      return Request.makeRequestTo(self._context, url, "namespace-grant", "namespace-grant-start", payload).then(function(result) {
        // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#NamespaceGrantServiceRequests-NamespaceGrantCompleteNotification
        Assert.isObject(result.namespaceGrantChallengeBundles);
        Assert.notEqual(typeof result.namespaceGrantChallengeBundles.namespaceGrantChallengeBundle, "undefined");

        var signedChallenge = null;
        Util.arrayForPayloadObject(result.namespaceGrantChallengeBundles.namespaceGrantChallengeBundle).forEach(function(info) {
          if (info.namespaceGrantChallenge.$id === challenge.$id) {
            signedChallenge = info;
          }
        });
        return signedChallenge;
      });
    });
  }

  return NamespaceGrant;

});
