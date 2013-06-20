
const ASSERT = require("assert");
const PATH = require("path");
const FS = require("fs-extra");
const WAITFOR = require("waitfor");
const SERVICE = require("./service");
const Crypto = require("../../lib/crypto");
const Util = require("../../lib/util");


exports.hook = function(options, app) {

	FS.removeSync(PATH.join(__dirname, ".identities"));

	var responder = SERVICE.responder(options, getPayload);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityLookupUpdateRequest
	app.post(/^\/.helpers\/identity-lookup-update$/, responder);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification#IdentityLookupServiceRequests
	app.post(/^\/.helpers\/identity-lookup$/, responder);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessLockboxUpdateRequest
	app.post(/^\/.helpers\/identity-access-lockbox-update$/, responder);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#IdentityServiceRequestsAnnex-IdentityAccessRolodexCredentialsGetRequest
	app.post(/^\/.helpers\/identity-access-rolodex-credentials-get$/, responder);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessStartNotification
	// NOTE: This should go to the webpage inner frame instead of a server.
	app.post(/^\/.helpers\/identity-access-start$/, responder);
}

function getPayload(request, options, callback) {
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityLookupUpdateRequest
	if (request.$handler === "identity" && request.$method === "identity-lookup-update") {
		ASSERT.equal(typeof request.clientNonce, "string");
		ASSERT.equal(typeof request.identity, "object");
		ASSERT.equal(typeof request.identity.uri, "string");
		ASSERT.equal(typeof request.identity.peer, "object");

		var identityParts = Util.parseIdentityURI(request.identity.uri);
		var path = PATH.join(__dirname, ".identities", identityParts.domain, identityParts.identity);
		FS.outputFileSync(path, JSON.stringify({
			peer: request.identity.peer
		}, null, 4));
		return callback(null, {});
	} else
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessLockboxUpdateRequest
	if (request.$handler === "identity" && request.$method === "identity-access-lockbox-update") {
		ASSERT.equal(typeof request.clientNonce, "string");
		ASSERT.equal(typeof request.identity, "object");
		ASSERT.equal(typeof request.lockbox, "object");

		return callback(null, {});
	} else
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityLookupServiceRequests-IdentityLookupRequest
	if (request.$handler === "identity-lookup" && request.$method === "identity-lookup") {
		ASSERT.equal(typeof request.providers, "object");
		ASSERT.equal(typeof request.providers.provider, "object");
		var provider = Util.arrayForPayloadObject(request.providers.provider);
		ASSERT.equal(provider.length > 0, true);
		var identities = [];
		provider.forEach(function(provider) {
			ASSERT.equal(typeof provider, "object");
			ASSERT.equal(typeof provider.base, "string");
			ASSERT.equal(typeof provider.separator, "string");
			ASSERT.equal(typeof provider.identities, "string");
			provider.identities.split(provider.separator).forEach(function(id) {
				var identity = provider.base + id;
				var identityParts = Util.parseIdentityURI(identity);
				var path = PATH.join(__dirname, ".identities", identityParts.domain, identityParts.identity);
				if (FS.existsSync(path)) {
					var publicPeerFile = JSON.parse(FS.readFileSync(path));
					var publicPeerFileInfo = Crypto.parsePublicPeerFile(publicPeerFile);
					identities.push({
		                "uri": identity,
		                "provider": identityParts.domain,
		                "stableID": publicPeerFileInfo.contact,
		                "peer": publicPeerFile.peer,
		                "priority": 5,
		                "weight": 1,
		                "updated": 0,
		                "expires": 0,	// 24 hours
		                "name": identityParts.identity,
		                "profile": "http://" + identityParts.domain + "/user/" + identityParts.identity + "/profile",
		                "vprofile": "http://" + identityParts.domain + "/user/" + identityParts.identity + "/vcard",
		                "feed": "http://" + identityParts.domain + "/user/" + identityParts.identity + "/feed",
		                "avatars": {
		                    "avatar": {
		                        "url": "http://" + identityParts.domain + "/user/" + identityParts.identity + "/avatar"
		                    }
		                }
					});
				}
			});
		});
		return callback(null, SERVICE.nestResponse(["identities", "identity"], identities));
	} else
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessStartNotification
	if (request.$handler === "identity" && request.$method === "identity-access-start") {
		ASSERT.equal(typeof request.agent, "object");
		ASSERT.equal(typeof request.identity, "object");
		ASSERT.equal(typeof request.browser, "object");
		var parsedIdentity = Util.parseIdentityURI(request.identity.base);
		// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessCompleteNotification
		var payload = {
			"identity": {
				// a verifiable token that is linked to the logged-in identity
				"accessToken": Util.randomHex(32),
				// a secret that can be used in combination to the "identity access token" to provide proof of previous successful login
				"accessSecret": Util.randomHex(32),
				"accessSecretExpires": Math.floor(Date.now()/1000) + 60,	// 60 seconds.
				"uri": request.identity.base,
				"provider": parsedIdentity.domain
				// TODO: Support `reloginKey`.
				//"reloginKey": "d2922f33a804c5f164a55210fe193327de7b2449-5007999b7734560b2c23fe81171af3e3-4c216c23"
			}
		};
		if (parsedIdentity.identity !== "test-lockbox-fresh") {
			payload.lockbox = {
				"domain": parsedIdentity.domain,
				// TODO: Use Lockbox key set by client.
				"keyIdentityHalf": "V20x...IbGFWM0J5WTIxWlBRPT0=",
				"reset": false
			};
		}
		return callback(null, payload);
	} else
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecificationAnnexRolodex/#IdentityServiceRequestsAnnex-IdentityAccessRolodexCredentialsGetRequest
	if (request.$handler === "identity" && request.$method === "identity-access-rolodex-credentials-get") {

		ASSERT.equal(typeof request.clientNonce, "string");
		ASSERT.equal(typeof request.identity, "object");
		ASSERT.equal(typeof request.identity.accessToken, "string");
		ASSERT.equal(typeof request.identity.accessSecretProof, "string");
		ASSERT.equal(typeof request.identity.accessSecretProofExpires, "number");

		return callback(null, {
			"rolodex": {
				"serverToken": "b3ff46bae8cacd1e572ee5e158bcb04ed9297f20-9619e3bc-4cd41c9c64ab2ed2a03b45ace82c546d"
			}
		});
	}
	return callback(null, null);
}
