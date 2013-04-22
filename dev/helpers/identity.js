
const ASSERT = require("assert");
const PATH = require("path");
const FS = require("fs-extra");
const WAITFOR = require("waitfor");
const SERVICE = require("./service");
const Crypto = require("../../lib/crypto");
const Util = require("../../lib/util");


exports.hook = function(options, app) {

	var responder = SERVICE.responder(options, getPayload);

	app.post(/^\/\.helpers\/identity\/ensure$/, function(req, res, next) {
		return ensureIdentity(req.body.identity, function(err) {
			if (err) return next(err);
			res.writeHead(200, {
				"Content-Type": "text/plain"
			});
			res.end();
		})
	});

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification#IdentityLookupServiceRequests
	app.post(/^\/.helpers\/identity$/, responder);
}


function ensureIdentity(identity, callback) {
	try {

		var identityParts = Util.parseIdentity(identity);

		var identityPath = PATH.join(__dirname, ".identities", "identity-" + identityParts.identity + ".json");

		if (FS.existsSync(identityPath)) {
			return callback(null, FS.readJsonSync(identityPath));
		}

		var info = {
			id: identity,
			name: identityParts.identity,
			displayName: identityParts.identity.toUpperCase(),
			mtime: Math.floor(Date.now()/1000),
			secret: Util.randomHex(32),
			domain: identityParts.domain,
			saltBundle: {
				real: 'salt',
				data: 'goes',
				here: true
			},
			findSecret: Util.randomHex(32),
			salt: Util.randomHex(32)
		};

		var pair = Crypto.generateKeyPair(1028);

		info.privatePem = pair.privatePem;
		info.publicPem = pair.publicPem;

		info.publicPeerFile = Crypto.generatePublicPeerFile({
			lifetime: 60 * 60 * 24 * 365,	// 1 Year
			saltBundle: info.saltBundle,
			findSecret: info.findSecret,
			identityBundle: null,
			privateKey: pair.privateKey,
			publicKey: pair.publicKey,
			domain: info.domain
		});

		info.contact = info.publicPeerFile.contact;

		info.privatePeerFile = Crypto.generatePrivatePeerFile({
			contact: info.contact,
			salt: info.salt,
			secret: info.secret,
			privateKey: pair.privateKey,
			publicPeerFile: info.publicPeerFile
		});

		FS.outputFileSync(identityPath, JSON.stringify(info, null, 4));

		return callback(null, info);

	} catch(err) {
		return callback(err);
	}
}


function getPayload(request, options, callback) {
	if (request.$handler === "identity-lookup" && request.$method === "identity-lookup") {
		ASSERT.equal(typeof request.providers, "object");
		ASSERT.equal(typeof request.providers.provider, "object");
		var provider = request.providers.provider;
		if (!Array.isArray(provider)) {
			provider = [ provider ];
		}
		ASSERT.equal(provider.length > 0, true);
		var identities = [];
		var waitfor = WAITFOR.serial(function(err) {
			if (err) return callback(err);
			return callback(null, SERVICE.nestResponse(["identities", "identity"], identities));
		});
		provider.forEach(function(provider) {
			ASSERT.equal(typeof provider, "object");
			ASSERT.equal(typeof provider.base, "string");
			ASSERT.equal(typeof provider.separator, "string");
			ASSERT.equal(typeof provider.identities, "string");
			provider.identities.split(provider.separator).forEach(function(id) {
				waitfor(function(done) {
					return ensureIdentity(provider.base + id, function(err, identity) {
						if (err) return done(err);
						// @see http://docs.openpeer.org/OpenPeerProtocolSpecification#IdentityLookupServiceRequests-IdentityLookupRequest
						identities.push({
			                "uri": identity.id,
			                "provider": identity.domain,
			                "stableID": identity.contact,
			                "peer": identity.publicPeerFile.peer,
			                "priority": 5,
			                "weight": 1,
			                "updated": identity.mtime,
			                "expires": identity.mtime + (60 *60 * 24),	// 24 hours
			                "name": identity.displayName,
			                "profile": "http://" + identity.domain + "/user/" + identity.name + "/profile",
			                "vprofile": "http://" + identity.domain + "/user/" + identity.name + "/vcard",
			                "feed": "http://" + identity.domain + "/user/" + identity.name + "/feed",
			                "avatars": {
			                    "avatar": {
			                        "url": "http://" + identity.domain + "/user/" + identity.name + "/avatar"
			                    }
			                }
						});
						return done(null);
					});
				});
			});
		});
		return waitfor();
	}
	return callback(null, null);
}
