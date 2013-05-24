
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
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxContentGetRequest
	app.post(/^\/.helpers\/lockbox-content-get$/, responder);
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxContentSetRequest
	app.post(/^\/.helpers\/lockbox-content-set$/, responder);
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
	            "$id": Util.randomHex(32),
	            "accessToken": Util.randomHex(32),
	            "accessSecret": Util.randomHex(32),
	            "accessSecretExpires": 8483943493,
	            "domain": request.lockbox.domain,
	            "keyLockboxHalf": Util.randomHex(32)
	        },
	        "grant": {
	            "$id": request.grant.$id,
	            "namespaces": {
	                "namespace": [
	                    {
	                        "$id": "https://meta.openpeer.org/ns/private-peer-file"
	                    }
	                ]
	            }
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
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLockboxServiceRequests-LockboxContentGetRequest
	if (request.$handler === "lockbox" && request.$method === "lockbox-content-get") {

		ASSERT.equal(typeof request.clientNonce, "string");
		ASSERT.equal(typeof request.lockbox, "object");
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
				var path = PATH.join(__dirname, ".lockboxes", request.grant.$id, "private-peer-file");
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
		ASSERT.equal(typeof request.grant, "object");
        ASSERT.notEqual(typeof request.grant.namespaces.namespace, "undefined");

		Util.arrayForPayloadObject(request.grant.namespaces.namespace).forEach(function(namespace) {
			if (namespace.$id === "https://meta.openpeer.org/ns/private-peer-file") {
				var path = PATH.join(__dirname, ".lockboxes", request.grant.$id, "private-peer-file");
				FS.outputFileSync(path, namespace.value);
			}
		});

		return callback(null, {});
	}
	return callback(null, null);
}
