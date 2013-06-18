
const ASSERT = require("assert");
const PATH = require("path");
const FS = require("fs-extra");
const WAITFOR = require("waitfor");
const SERVICE = require("./service");
const Crypto = require("../../lib/crypto");
const Util = require("../../lib/util");


exports.hook = function(options, app) {

	FS.removeSync(PATH.join(__dirname, ".lockboxes"));

	var responder = SERVICE.responder(options, getPayload);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxAccessRequest
	app.post(/^\/.helpers\/lockbox-access$/, responder);
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxIdentitiesUpdateRequest
	app.post(/^\/.helpers\/lockbox-identities-update$/, responder);
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxContentGetRequest
	app.post(/^\/.helpers\/lockbox-content-get$/, responder);
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxContentSetRequest
	app.post(/^\/.helpers\/lockbox-content-set$/, responder);
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxNamespaceGrantChallengeValidateRequest
	app.post(/^\/.helpers\/lockbox-namespace-grant-challenge-validate$/, responder);
}

function getPayload(request, options, callback) {
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxAccessRequest
	if (request.$handler === "lockbox" && request.$method === "lockbox-access") {

		ASSERT.equal(typeof request.clientNonce, "string");
		ASSERT.equal(typeof request.identity, "object");
		ASSERT.equal(typeof request.grant, "object");
		ASSERT.equal(typeof request.agent, "object");
		ASSERT.equal(typeof request.lockbox, "object");

		return callback(null, {
	        "lockbox": {
	            "$id": Crypto.sha1(request.identity.uri),
	            "accessToken": Crypto.sha1(request.identity.uri),
	            "accessSecret": Util.randomHex(32),
	            "accessSecretExpires": Math.floor(Date.now()/1000) + 60 * 60 * 24,	// 24 hours
	            "domain": request.lockbox.domain,
	            "keyLockboxHalf": Crypto.sha1(request.identity.uri)
	        },
			"namespaceGrantChallenge": {
				"$id": "20651257fecbe8436cea6bfd3277fec1223ebd63",
				"name": "Provider Lockbox Service",
				"image": "https://provider.com/lockbox/lockbox.png",
				"url": "https://provider.com/lockbox/",
				"domains": "trust.com,trust2.com"
			},
	        "identities": {
	            "identity": [
	                {
	                    "uri": request.identity.uri,
	                    "provider": request.identity.provider
	                }
	            ]
	        }
		});
	} else
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxIdentitiesUpdateRequest
	if (request.$handler === "lockbox" && request.$method === "lockbox-identities-update") {

		ASSERT.equal(typeof request.clientNonce, "string");
		ASSERT.equal(typeof request.lockbox, "object");
		ASSERT.equal(typeof request.identities, "object");
		ASSERT.equal(Array.isArray(request.identities.identity), true);

		return callback(null, {
	        "identities": {
	            "identity": Util.arrayForPayloadObject(request.identities.identity).map(function(identity) {
	                return {
	                    "uri": identity.uri,
	                    "provider": identity.provider
	                };
	            })
	        }
		});
	} else
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxContentGetRequest
	if (request.$handler === "lockbox" && request.$method === "lockbox-content-get") {

		ASSERT.equal(typeof request.clientNonce, "string");
		ASSERT.equal(typeof request.lockbox, "object");
		ASSERT.equal(typeof request.lockbox.accessToken, "string");
		ASSERT.equal(typeof request.grant, "object");
        ASSERT.notEqual(typeof request.grant.namespaces.namespace, "undefined");

		var payload = {
	        "grant": {
		      "$id": request.grant.$id,
		      "namespaces":{
		        "namespace": []
		      }
		    }
		};

		Util.arrayForPayloadObject(request.grant.namespaces.namespace).forEach(function(namespace) {
			if (namespace.$id === "https://meta.openpeer.org/ns/private-peer-file") {
				var path = PATH.join(__dirname, ".lockboxes", request.lockbox.accessToken, "private-peer-file");
				if (FS.existsSync(path)) {
					payload.grant.namespaces.namespace.push({
			            "$id": namespace.$id,
			            "value": FS.readFileSync(path).toString()
					});
				}
			}
		});

		return callback(null, payload);
	} else
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxContentSetRequest
	if (request.$handler === "lockbox" && request.$method === "lockbox-content-set") {

		ASSERT.equal(typeof request.clientNonce, "string");
		ASSERT.equal(typeof request.lockbox, "object");
		ASSERT.equal(typeof request.lockbox.accessToken, "string");
		ASSERT.equal(typeof request.grant, "object");
        ASSERT.notEqual(typeof request.grant.namespaces.namespace, "undefined");

		Util.arrayForPayloadObject(request.grant.namespaces.namespace).forEach(function(namespace) {
			if (namespace.$id === "https://meta.openpeer.org/ns/private-peer-file") {
				var path = PATH.join(__dirname, ".lockboxes", request.lockbox.accessToken, "private-peer-file");
				FS.outputFileSync(path, namespace.value);
			}
		});

		return callback(null, {});
	} else
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxNamespaceGrantChallengeValidateRequest
	if (request.$handler === "lockbox" && request.$method === "lockbox-namespace-grant-challenge-validate") {

		ASSERT.equal(typeof request.clientNonce, "string");
		ASSERT.equal(typeof request.lockbox, "object");
		ASSERT.equal(typeof request.lockbox.accessToken, "string");
		ASSERT.equal(typeof request.namespaceGrantChallengeBundle.namespaceGrantChallenge, "object");
		ASSERT.equal(typeof request.namespaceGrantChallengeBundle.signature, "object");

		return callback(null, {});
	}
	return callback(null, null);
}
