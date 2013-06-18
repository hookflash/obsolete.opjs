
const ASSERT = require("assert");
const PATH = require("path");
const FS = require("fs-extra");
const WAITFOR = require("waitfor");
const SERVICE = require("./service");
const Crypto = require("../../lib/crypto");
const Util = require("../../lib/util");


exports.hook = function(options, app) {

	var responder = SERVICE.responder(options, getPayload);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#NamespaceGrantServiceRequests-NamespaceGrantStartNotification
	app.post(/^\/.helpers\/namespace-grant-start$/, responder);
}

function getPayload(request, options, callback) {
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#NamespaceGrantServiceRequests-NamespaceGrantStartNotification
	if (request.$handler === "namespace-grant" && request.$method === "namespace-grant-start") {

		ASSERT.equal(typeof request.agent, "object");
		ASSERT.equal(typeof request.namespaceGrantChallenges, "object");
		ASSERT.equal(typeof request.browser, "object");

		// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#NamespaceGrantServiceRequests-NamespaceGrantCompleteNotification
		return callback(null, {
			"namespaceGrantChallengeBundles": {
				"namespaceGrantChallengeBundle": Util.arrayForPayloadObject(request.namespaceGrantChallenges.namespaceGrantChallenge).map(function(namespaceGrantChallenge) {
	                return {
	                	"namespaceGrantChallenge": namespaceGrantChallenge,
						"signature": {
							"reference": "#20651257fecbe8436cea6bfd3277fec1223ebd63",
							"algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
							"digestValue": "IUe324k...oV5/A8Q38Gj45i4jddX=",
							"digestSigned": "MDAwMDAw...MGJ5dGVzLiBQbGVhc2UsIGQ=",
							"key": {
								"$id": "b7ef37...4a0d58628d3",
								"domain": "provider.com",
								"service": "namespace-grant"
							}
						}
	                };
	            })
	        }
		});
	}
	return callback(null, null);
}
