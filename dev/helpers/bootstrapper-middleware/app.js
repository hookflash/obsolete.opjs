
const ASSERT = require("assert");


function parseRequest(req, callback) {
    var data = '';
    req.setEncoding('utf8');
    req.on('data', function(chunk) { 
        data += chunk;
    });
    req.on('end', function() {
    	try {
	    	return callback(null, JSON.parse(data));
	    } catch(err) {
	    	return callback(err);
	    }
    });
}

exports.hook = function(options, app) {

	function respond(req, res, next) {
		return parseRequest(req, function(err, data) {
			if (err) return next(err);

			try {

				var request = data.request;

				// TODO: Verify `data.request.$domain`?

				var hostname = options.host.split(":")[0];
				ASSERT.equal(request.$domain, hostname);

				var response = getPayload(request, options);
				if (!response) {
					res.writeHead(404);
					res.end("Not found");
					return;
				}

				var payload = {
					"result": {
					    "$domain": hostname,
					    "$appid": request.$appid,
					    "$id": request.$id,
					    "$handler": request.$handler,
					    "$method": request.$method,
					    "$timestamp": (Date.now() / 1000)
					}
				};
				for (var key in response) {
					payload.result[key] = response[key];
				}

				payload = JSON.stringify(payload, null, 4);
				res.writeHead(200, {
					"Content-Type": "application/json",
					"Content-Length": payload.length
				});
				res.end(payload);
			} catch(err) {
				console.error(err.stack);
				res.writeHead(500);
				res.end("Internal Server Error");
				return;
			}
        });
	}

	// `https://domain.com/.well-known/openpeer-services-get`
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#BootstrapperServiceRequests-ServicesGetRequest
	app.post(/^\/\.well-known\/openpeer-services-get$/, respond);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#BootstrappedFinderServiceRequests-FindersGetRequest
	app.post(/^\/.helpers\/bootstrapper-middleware\/finders-get$/, respond);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#CertificatesServiceRequests-CertificatesGetRequest
	app.post(/^\/.helpers\/bootstrapper-middleware\/certificates-get$/, respond);
}

function getPayload(request, options) {

	if (request.$handler === "certificates" && request.$method === "certificates-get") {
		return {
		    "certificates": {
		      "certificateBundle": [
		        {
		          "certificate": {
		            "$id": "4bf7fff50ef9bb07428af6294ae41434da175538",
		            "service": "finder",
		            "expires": 48348383,
		            "key": { "x509Data": "MIIDCCA0+gA...lVN" }
		          },
		          "signature": {
		            "reference": "#4bf7fff50ef9bb07428af6294ae41434da175538",
		            "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
		            "digestValue": "jeirjLrta6skoV5/A8Q38Gj4j323=",
		            "digestSigned": "DEf...GM~C0/Ez=",
		            "key": {
		              "$id": "9bdd14...dda3fddd5bd2",
		              "domain": "example.com",
		              "service": "bootstrapper"
		            }
		          }
		        },
		        {
		          "certificate": {
		            "$id": "9bdd14...dda3fddd5bd2",
		            "service": "bootstrapper",
		            "expires": 48348383,
		            "key": { "x509Data": "OWJkZD...GQ1YmQy=" }
		          },
		          "signature": {
		            "reference": "#9bdd14...dda3fddd5bd2",
		            "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
		            "digestValue": "amVpcmpMcn...RhNnNrb1Y1L0E4UTM4R2o0ajMyMz0=",
		            "digestSigned": "YW1WcGNtcE1jb...lJoTm5OcmIxWTFMMEU0VVRNNFIybzBhak15TXowPQ==",
		            "key": {
		              "$id": "9bdd14...dda3fddd5bd2",
		              "domain": "example.com",
		              "service": "bootstrapper"
		            }
		          }
		        }
		      ]
		    }
		};
	} else
	if (request.$handler === "bootstrapper-finder" && request.$method === "finders-get") {
		return {
		    "finders": {
		      "finderBundle": [
		        {
		          "finder": {
		            "$id": "4bf7fff50ef9bb07428af6294ae41434da175538",
		            "transport": "rudp/udp",
		            "srv": "finders.example.com",
		    // TODO: Update this according to spec
            "wsUri": "ws://localhost:3002",
		            "key": { "x509Data": "MIIDCCA0+gA...lVN" },
		            "priority": 1,
		            "weight": 1,
		            "region": "1",
		            "created": 588584945,
		            "expires": 675754754
		          },
		          "signature": {
		            "reference": "#4bf7fff50ef9bb07428af6294ae41434da175538",
		            "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
		            "digestValue": "jeirjLr...ta6skoV5/A8Q38Gj4j323=",
		            "digestSigned": "DE...fGM~C0/Ez=",
		            "key": {
		              "$id": "9bdd14dda3f...dd174b5d5bd2",
		              "domain": "example.org",
		              "service": "finder"
		            }
		          }
		        },
		        {
		          "finder": {
		            "$id": "a7f0c5df6d118ee2a16309bc8110bce009f7e318",
		            "transport": "rudp/udp",
		            "srv": "100.200.100.1:4032,5.6.7.8:4032",
		    // TODO: Update this according to spec
            "wsUri": "ws://localhost:3002",
		            "key": { "x509Data": "MIID5A0+gA...lVN" },
		            "priority": 10,
		            "weight": 0,
		            "region": 1
		          },
		          "signature": {
		            "reference": "#a7f0c5df6d118ee2a16309bc8110bce009f7e318",
		            "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
		            "digestValue": "YTdmMGM1ZGY2Z...DExOGVlMmExNjMwJjZTAwOWY3ZTMxOA==",
		            "digestSigned": "OjY2OjZl...OjZhOjcyOjY2OjcyOjcyIChsZW5ndGg9OSk=",
		            "key": {
		              "$id": "9bdd14dda3f...dd174b5d5bd2",
		              "domain": "example.org",
		              "service": "finder"
		            }
		          }
		        }
		      ]
		    }
		};
	} else
	if (request.$handler === "bootstrapper" && request.$method === "services-get") {
		return {
	        "services": {
	            "service": [
	                {
	                    "$id": "9bdd14ddad8465b6ee3fdd174b5d5bd2",
	                    "type": "bootstrapper",
	                    "version": "1.0",
	                    "methods": {
	                        "method": {
	                            "name": "services-get",
	                            "uri": "https://bootstrapper.example.com/services-get"
	                        }
	                    }
	                },
	                {
	                    "$id": "596c4577a4efb2a13ded43a3851b7e51577ad186",
	                    "type": "bootstrapped-finders",
	                    "version": "1.0",
	                    "methods": {
	                        "method": {
	                            "name": "finders-get",
	                            "uri": "https://" + options.host + "/.helpers/bootstrapper-middleware/finders-get"
	                        }
	                    }
	                },
	                {
	                    "$id": "596c4577a4efb2a13ded43a3851b7e51577ad186",
	                    "type": "certificates",
	                    "version": "1.0",
	                    "methods": {
	                        "method": {
	                            "name": "certificates-get",
	                            "uri": "https://" + options.host + "/.helpers/bootstrapper-middleware/certificates-get"
	                        }
	                    }
	                },
	                {
	                    "$id": "0c16f792d6e0727e0acdd9174ae737d0abedef12",
	                    "type": "identity-lockbox",
	                    "version": "1.0",
	                    "methods": {
	                        "method": [
	                            {
	                                "name": "public-peer-files-get",
	                                "uri": "https://peer-contact.example.com/public-peer-files-get"
	                            },
	                            {
	                                "name": "peer-contact-login",
	                                "uri": "https://peer-contact.example.com/peer-contact-login"
	                            },
	                            {
	                                "name": "private-peer-file-get",
	                                "uri": "https://peer-contact.example.com/private-peer-file-get"
	                            },
	                            {
	                                "name": "private-peer-file-set",
	                                "uri": "https://peer-contact.example.com/private-peer-file-set"
	                            },
	                            {
	                                "name": "peer-contact-identity-associate",
	                                "uri": "https://peer-contact.example.com/peer-contact-identity-associate"
	                            },
	                            {
	                                "name": "peer-contact-identity-association-update",
	                                "uri": "https://peer-contact.ex.com/peer-contact-identity-association-update"
	                            },
	                            {
	                                "name": "peer-contact-services-get",
	                                "uri": "https://peer-contact.example.com/peer-contact-services-get"
	                            }
	                        ]
	                    }
	                },
	                {
	                    "$id": "d0b528b3f8e66455d154b1deac1e357e",
	                    "type": "identity-lockbox",
	                    "version": "1.0",
	                    "methods": {
	                        "method": [
	                            {
	                                "name": "lockbox-access",
	                                "uri": "https://lockbox.example.com/lockbox-access"
	                            },
	                            {
	                                "name": "lockbox-identities-update",
	                                "uri": "https://lockbox.example.com/lockbox-identities-update"
	                            },
	                            {
	                                "name": "lockbox-permissions-grant-inner-frame",
	                                "uri": "https://lockbox.example.com/lockbox-permissions-grant-inner-frame"
	                            },
	                            {
	                                "name": "lockbox-content-get",
	                                "uri": "https://lockbox.example.com/lockbox-content-get"
	                            },
	                            {
	                                "name": "lockbox-content-set",
	                                "uri": "https://lockbox.example.com/lockbox-content-set"
	                            },
	                            {
	                                "name": "lockbox-admin-inner-frame",
	                                "uri": "https://lockbox.example.com/lockbox-admin-inner-frame"
	                            }
	                        ]
	                    }
	                },
	                {
	                    "$id": "d0b528b3f8e66455d154b1deac1e357e",
	                    "type": "identity-lookup",
	                    "version": "1.0",
	                    "methods": {
	                        "method": [
	                            {
	                                "name": "identity-lookup-check",
	                                "uri": "https://identity-lookup.example.com/identity-check"
	                            },
	                            {
	                                "name": "identity-lookup",
	                                "uri": "https://identity-lookup.example.com/identity-lookup"
	                            }
	                        ]
	                    }
	                },
	                {
	                    "$id": "f98b4d1ff0f1acf3054fefc560866e61",
	                    "type": "identity",
	                    "version": "1.0",
	                    "methods": {
	                        "method": [
	                            {
	                                "name": "identity-access-inner-frame",
	                                "uri": "https://identity.example.com/identity-access-inner-frame"
	                            },
	                            {
	                                "name": "identity-access-validate",
	                                "uri": "https://identity.example.com/identity-access-validate"
	                            },
	                            {
	                                "name": "identity-lookup-update",
	                                "uri": "https://identity.example.com/identity-lookup-update"
	                            },
	                            {
	                                "name": "identity-sign",
	                                "uri": "https://identity.example.com/identity-sign"
	                            }
	                        ]
	                    }
	                },
	                {
	                    "$id": "2b24016d58b04f0a3b157a82ddd5f18b44d8912a",
	                    "type": "peer",
	                    "version": "1.0",
	                    "methods": {
	                        "method": {
	                            "name": "peer-services-get",
	                            "uri": "https://peer.example.com/peer-services-get"
	                        }
	                    }
	                },
	                {
	                    "$id": "db144bb314f8e018f103033cbba7d52e",
	                    "type": "salt",
	                    "version": "1.0",
	                    "methods": {
	                        "method": {
	                            "name": "signed-salt-get",
	                            "uri": "https://salt.example.com/signed-salt-get"
	                        }
	                    }
	                },
	                {
	                    "$id": "db144bb314f8e018f103033cbba7d52e",
	                    "type": "example",
	                    "version": "1.0",
	                    "key": {
	                        "$id": "8cd14dda3...d5bd2",
	                        "domain": "example.com",
	                        "service": "something"
	                    },
	                    "methods": {
	                        "method": {
	                            "name": "example-method",
	                            "uri": "peer://example.com/5ff106c7db894b96a1432c35c246f36d8414bbd3"
	                        }
	                    }
	                }
	            ]
	        }
		};
	}
	return null;
}
