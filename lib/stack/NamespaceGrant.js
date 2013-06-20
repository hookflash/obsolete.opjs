
define([
  'opjs/assert',
  'opjs/request',
  'opjs/util',
  'opjs/crypto',
  'q/q'
], function (Assert, Request, Util, Crypto, Q) {

  // Import globals
  var WINDOW = window;

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

  NamespaceGrant.prototype.getGrantId = function() {
    if (this._ready === null) throw new Error("Object has been destroyed");
    if (typeof WINDOW.localStorage === "undefined") {
      self.warn("Cannot keep grant ID for longer than this page session as HTML5 Local Storage not available!");
      // TODO: Could keep it in a long-lasting cookie or other more platform specific storage mechanism.
    }
    var key = "openpeer.namespace.grantId";
    // TODO: Encrypt grant ID with private peer file secret?
    if (!WINDOW.localStorage[key]) {
      WINDOW.localStorage[key] = Util.randomHex(32);
    }
    return WINDOW.localStorage[key];
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
