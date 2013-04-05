

exports.hook = function(app) {

	// `https://domain.com/.well-known/openpeer-services-get`
	app.get(/^\/\.well-known\/openpeer-services-get$/, function(req, res, next) {
		var payload = JSON.stringify(getServicesPayload().result, null, 4);
		res.writeHead(200, {
			"Content-Type": "application/json",
			"Content-Length": payload.length
		});
		res.end(payload);
	});
}


function getServicesPayload() {
	return {
	    "result": {
	        "$domain": "example.com",
	        "$handler": "bootstrapper",
	        "$method": "services-get",
	        "$timestamp": 439439493,
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
	                            "uri": "https://finders.example.com/finders-get"
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
	                            "uri": "https://certificates.example.com/certificates-get"
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
	    }
	};
}
