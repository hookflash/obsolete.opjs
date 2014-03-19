
const ASSERT = require("assert");
const PATH = require("path");
const FS = require("fs-extra");
const WAITFOR = require("waitfor");
const SERVICE = require("./service");
const Crypto = require("opjs-primitives/lib/crypto");
const Util = require("opjs-primitives/lib/util");


exports.hook = function(options, app) {

	var responder = SERVICE.responder(options, getPayload);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#RolodexServiceRequests-RolodexAccessRequest
	app.post(/^\/.helpers\/rolodex-access$/, responder);
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#RolodexServiceRequests-RolodexNamespaceGrantChallengeValidateRequest
	app.post(/^\/.helpers\/rolodex-namespace-grant-challenge-validate$/, responder);
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#RolodexServiceRequests-RolodexContactsGetRequest
	app.post(/^\/.helpers\/rolodex-contacts-get$/, responder);
}

function getPayload(request, options, callback) {
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#RolodexServiceRequests-RolodexAccessRequest
	if (request.$handler === "rolodex" && request.$method === "rolodex-access") {

		ASSERT.equal(typeof request.clientNonce, "string");

		ASSERT.equal(typeof request.identity, "object");
		ASSERT.equal(typeof request.identity.accessToken, "string");
		ASSERT.equal(typeof request.identity.accessSecretProof, "string");
		ASSERT.equal(typeof request.identity.accessSecretProofExpires, "number");
		ASSERT.equal(typeof request.identity.uri, "string");

		ASSERT.equal(typeof request.rolodex, "object");
		ASSERT.equal(typeof request.rolodex.serverToken, "string");

		ASSERT.equal(typeof request.agent, "object");
		ASSERT.equal(typeof request.agent.userAgent, "string");
		ASSERT.equal(typeof request.agent.name, "string");
		ASSERT.equal(typeof request.agent.url, "string");

		ASSERT.equal(typeof request.grant, "object");
		ASSERT.equal(typeof request.grant.$id, "string");

		return callback(null, {
			"rolodex": {
				"accessToken": "91c4d836e216139f6fe4d417ca19afe78bab87d2",
				"accessSecret": "943ec6e93c71591d3ee43464059b25ecd6312a07",
				"accessSecretExpires": 5848443,
				"updateNext": 54433434
			},
			"namespaceGrantChallenge": {
				"$id": "20651257fecbe8436cea6bfd3277fec1223ebd63",
				"name": "Provider Rolodex Service",
				"image": "https://provider.com/rolodex/rolodex.png",
				"url": "https://provider.com/rolodex/",
				"domains": "trust.com,trust2.com"
			}
		});
	} else
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#RolodexServiceRequests-RolodexNamespaceGrantChallengeValidateRequest
	if (request.$handler === "rolodex" && request.$method === "rolodex-namespace-grant-challenge-validate") {

		ASSERT.equal(typeof request.clientNonce, "string");

		ASSERT.equal(typeof request.rolodex, "object");
		ASSERT.equal(typeof request.rolodex.serverToken, "string");
		ASSERT.equal(typeof request.rolodex.accessToken, "string");
		ASSERT.equal(typeof request.rolodex.accessSecretProof, "string");
		ASSERT.equal(typeof request.rolodex.accessSecretProofExpires, "number");

		ASSERT.equal(typeof request.namespaceGrantChallengeBundle, "object");
		ASSERT.equal(typeof request.namespaceGrantChallengeBundle.namespaceGrantChallenge, "object");
		ASSERT.equal(typeof request.namespaceGrantChallengeBundle.signature, "object");

		return callback(null, {});
	} else
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#RolodexServiceRequests-RolodexContactsGetRequest
	if (request.$handler === "rolodex" && request.$method === "rolodex-contacts-get") {

		ASSERT.equal(typeof request.clientNonce, "string");

		ASSERT.equal(typeof request.rolodex, "object");
		ASSERT.equal(typeof request.rolodex.serverToken, "string");
		ASSERT.equal(typeof request.rolodex.accessToken, "string");
		ASSERT.equal(typeof request.rolodex.accessSecretProof, "string");
		ASSERT.equal(typeof request.rolodex.accessSecretProofExpires, "number");
//		ASSERT.equal(typeof request.rolodex.version, "string");
		ASSERT.equal(typeof request.rolodex.refresh, "boolean");

		return callback(null, {
			"rolodex": {
				"updateNext": 54433434,
				"version": false
			},
			"identities": {
				"identity": [
					{
						"$disposition": "update",
						"uri": "identity://foo.com/alice",
						"provider": "foo.com",
						"name": "Alice Applegate",
						"profile": "http://domain.com/user/alice/profile",
						"vprofile": "http://domain.com/user/alice/vcard",
						"feed": "http://domain.com/user/alice/feed",
						"avatars": {
							"avatar": {
								"url": "http://domain.com/user/alice/p"
							}
						}
					},
					{
						"$disposition": "remove",
						"uri": "identity://foo.com/bob",
						"provider": "foo.com"
					}
				]
			}
		});
	}
	return callback(null, null);
}
