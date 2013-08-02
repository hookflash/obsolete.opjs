
const ASSERT = require("assert");
const REQUEST = require("request");
const URL = require("url");
const SERVICE = require("./service");
const Util = require("../../lib/util");


var IDENTITY_HOST = "idprovider-javascript.hookflash.me";
var BOOTSTRAPPER_HOST = "provisioning-stable-dev.hookflash.me";


exports.hook = function(options, app) {

	var responder = SERVICE.responder(options, getPayload);

	// `https://domain.com/.well-known/openpeer-services-get`
	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#BootstrapperServiceRequests-ServicesGetRequest
    app.post(/^\/\.well-known\/openpeer-services-get$/, responder);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#BootstrappedFinderServiceRequests-FindersGetRequest
	app.post(/^\/.helpers\/finders-get$/, responder);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#CertificatesServiceRequests-CertificatesGetRequest
	app.post(/^\/.helpers\/certificates-get$/, responder);

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerSaltServiceProtocol-SignedSaltGetRequest
	app.post(/^\/.helpers\/signed-salt-get$/, responder);
}

function getPayload(request, options, callback) {

	if (request.$handler === "peer-salt" && request.$method === "signed-salt-get") {
		ASSERT(typeof request.salts === "number");
		var bundles = [];
		for (var i=0 ; i<request.salts ; i++) {
			bundles.push({
                "salt": {
                    "$id": Util.randomHex(32),
                    "#text": Util.randomHex(32)
                },
                "signature": {
                    "reference": "#f43173fa6aa774563751f8ae950d8b867cae0715",
                    "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
                    "digestValue": "60b802d1799988f0b6553ad649d4039571b2d1d9",
                    "digestSigned": "PmKWWgkQaMLL4uju1z6NT0xUCd0piVo0Z7pjI4xwUS2mZXrq/invmR4lSGwF0HqHV7A+kySXbXYFXSqZUO9TRFvVNwQxMtMntSFPel226r80X2rzcEwk1Ydky+Xey3/Yq1AQnPjcTHPBrRu8RHaUOOrrmNViLZWpPEs141DPlAPSjeiNjz6A7GgvGCpayU3stph7TQaPjbW1aVvX0o0VsoXZwWl8Uf3Cxvq9C555OzivPGmnXGy+SGFie752NgKkWYDUc8xz0Mriv5gbN4UceXcVT74B+6xO2Pv9X00nE4qeeUObeo5i2vcNZzTCMStngMv75ub2pCDxqzPni+jzgA==",
                    "key": {
                        "$id": "ce833a6a40ceab77d288643ec9c2a81df9f0db12",
                        "domain": "unstable.hookflash.me",
                        "service": "salt"
                    }
                }
            });
		}
		return callback(null, SERVICE.nestResponse(["salts", "saltBundle"], bundles));
	} else
	if (request.$handler === "certificates" && request.$method === "certificates-get") {
		return callback(null, SERVICE.nestResponse(["certificates", "certificateBundle"], [
            {
                "certificate": {
                    "$id": "b1ad4a059d4726f563b2fb04ed061ed5b909c66b",
                    "service": "bootstrapper",
                    "expires": 1393492920,
                    "key": {
                        "x509Data": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0ttKm722dk0nyAxMheVBbBSNIe8IelchdYGovrXU+rB/BKgxk/rnFMS0xOotgExbe+l/Wq0RE1gCwZOJp5wlr1lqidFQblY09CjzqibqdfPXUI5B9qcZKJfVwOvbkjNsgh5esuiEBMEOcYaprapYG7QIzd5pK20sbDG1GxFsSjLVbOSwWFYvNHEt02XuCZlCUPgvI9PX/B4EaFJjX4I6oAzeI6FOR5vKE5QYdY1T3Yh2eJRtayJP/Tn9Ni9D4d94oP/+YoMqymnZx8WRQV/O9QYM3zu8CThrNvRv73AdjdbDYYiFFCG5Tn2qQ1fY7Tu2UlWgTplHwL3cdCv189+N7QIDAQAB"
                    }
                },
                "signature": {
                    "reference": "#b1ad4a059d4726f563b2fb04ed061ed5b909c66b",
                    "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
                    "digestValue": "f1ba0e80e08588c76102a0e7f27ec25528e2bc71",
                    "digestSigned": "dcy9AbvlrRfpzOrTQ/8i+XyOaA/Q2NGgyQZHcESMO28Y3iKrdFmtfb164c3myWZUxTDKt4/SZWdj/3//jG6NjC+1CDLrtezlwztds7bx1KNL10btlZMUpCi69k+4EB7TQcXz/RrpxDsYz9vBTgGwIcWFnYCyYh32NXWK5EQJiZFuHebVP23brNfxbGSpE3V9R+dc04NKIRn9ZDbqIgzuzN2T/bmI2e82bg8tlclAcY/PQDXKWbp/KNsSx1IpD7tuxTD349syB4W5L5nQLs/2xNMfpH0QuC9aXAROPB8qS+fsRQ7oRfPT0At2UBI3uS0dgjniHR5Nv3iiNk65wUHrrQ==",
                    "key": {
                        "$id": "4b67636b8753d0e544342b4aa25c579f6487bf71",
                        "domain": "unstable.hookflash.me",
                        "service": "certificates"
                    }
                }
            },
            {
                "certificate": {
                    "$id": "4b67636b8753d0e544342b4aa25c579f6487bf71",
                    "service": "certificates",
                    "expires": 1393492923,
                    "key": {
                        "x509Data": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkNeMejxTdebM2diPMs/jR+gZ1ZuW++mGeFAwC1sB4X8P6SlYko3QhVvVxSENaSM8CxJ//kK06RGilhVRo3jfb6razfUbT2L5xFa0/XAG3lt/m2Dc4Hlq9ibqDH1S03fzNT3+KedZRG8+VdIWZdJIFFNhOOK3tUyWDBf0gi+75e2hZ8MKq5bkttO+oAZuGjt3XvRfyRZ+UB65T2W0+dkPKwlnCDBHbltb6+0Je+wFCVPzpXdzq2zGf7tEjGoebDnkOu4F95LFEgBd4li+lsEgdkpXpZYuu9sxu3wDXp0GyyeFhoniU7vZVCO2iLyVvgXhiNpsCmD3vsK2IcmsRD5zCQIDAQAB"
                    }
                },
                "signature": {
                    "reference": "#4b67636b8753d0e544342b4aa25c579f6487bf71",
                    "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
                    "digestValue": "3ffee104dc4bf420c033907b4f06875e7c38c9b5",
                    "digestSigned": "Z/RyD2U1+8BF5J6PzGmkfXOC3n2lp5CEZuBjIStqGRavD6VLncQWh7dX3RJ0lQyBy1kxDl6hOPMLwBc6mZhzoWt0SIMREVYE4rLA9gKdMmMbfE6QG1vPl8SjAC2OXu5+7lZHA33f0yU8wmnSytO31ZaM5SLxLvmLlDPcvexVt3wkMDZOyxxKYxCZKjPUcWLVXbI/7bAEC14pNCro0XZ6bnFgokJ1Pp/MeLxtJ+QUgWPrjzg9aueoZjlDknQRs3/IMyRYyi475CHa9+GsAzK9BxyYEXyznR2n2dqENAxJ4KtgKpcwYKgZJACPHfD4Kjb2Saa+CqaIeeylWL3g5xxpYg==",
                    "key": {
                        "$id": "4b67636b8753d0e544342b4aa25c579f6487bf71",
                        "domain": "unstable.hookflash.me",
                        "service": "certificates"
                    }
                }
            },
            {
                "certificate": {
                    "$id": "8d6062d23e84e9cd5f18134ba9531a48bd45fbab",
                    "service": "bootstrapped-finders",
                    "expires": 1393492924,
                    "key": {
                        "x509Data": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAhrU9V1Fhz1CGrveKsYe4eZ1FA8OboUJmIoq2/9du92AFN41C4fL/R9EdDh2j30zO7xCy7Nf4OsDKt9d5cz9eDP9s9EDXdvbFQHgW+bSzJF2Li3poxdprIfS9LiyC+x8V9sLBwarh9E17EyrfcdmAWjlXNhTzVr4PcoLJsiZdERXXbfePQVb0k/ud8U6u9bj5Ong7u4bSL9lHqCvb0As9ycjz72BlEp7wI9kyMWrpANmL0ui/gMgD852J1pR/cpvVBsw14F2TuQgv/Yrqy35HCFjKnCuTwF5eqgOBcoRlaYgSesZvRbLCKnTxr89zf9Ef2DvY8KtVmvsQEcNcBFUXzwIDAQAB"
                    }
                },
                "signature": {
                    "reference": "#8d6062d23e84e9cd5f18134ba9531a48bd45fbab",
                    "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
                    "digestValue": "9b43fdb36442ec86d197b795f837cb00baaa6b5d",
                    "digestSigned": "JItJGD2h/rJNCTZ6PLJF9QHgG56cpnCOWkIOCBX4xIybQ4ylmjiaV0WtFbF4tJWD37vxDXEDb1VffoEZbnHwUQi+zrKLTI0+XI2iAb8Mpb9upWCj3dIoLcSnvu2v+mAiL+Ze5wfpfMGlYsjTNN9B2O6zSmeE0GW65KNa6AffOe06DPCFNMC5evTIgYkliadOjpCVpATrrmH4BmRBP6z4uEoq6BF04eupmWzv+ZNtkKORHhixVnYAz8TgWVAuoaHgERCYNiGOcX/lA6gxsoe576zy0U98VmNHNR7JQGWLDtH7UTtouZTJvus1tcNvjigpBuMhYyFTBHeMnsyawbPxLg==",
                    "key": {
                        "$id": "4b67636b8753d0e544342b4aa25c579f6487bf71",
                        "domain": "unstable.hookflash.me",
                        "service": "certificates"
                    }
                }
            },
            {
                "certificate": {
                    "$id": "ce833a6a40ceab77d288643ec9c2a81df9f0db12",
                    "service": "salt",
                    "expires": 1393492925,
                    "key": {
                        "x509Data": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApFPGqBxPmSh0ie0DvWi79XsA0DybzKn2cixmQ4Fd0cCCs6Gaa+nYr9SqD/9+xJpKIAB28d/6BO96f/NrnGtKSsUOTds+UtGaK8ogx12em+nZGajAT54b/PMrTtNAYb2CEzddFngIKjOPTPMGyjZGCz6xaaAMemgA2MD495CNNVKZ5x6m5ESdZHAW45+whZ1zKa/kAOlFFWfTmAsZeE0r2GjDHCGk66vwKVYhVkzA2QcfDFmipqzKhvbBYk3RZtJDJTfqwD0uKEeJDXa0C2beInwEODbs1OonNsGvLOzofVyB8MH2JESRIoO8B7MJh1n6nsK5mUHZjN0Ze/c28MWQwwIDAQAB"
                    }
                },
                "signature": {
                    "reference": "#ce833a6a40ceab77d288643ec9c2a81df9f0db12",
                    "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
                    "digestValue": "38096a187d78a6bb86fc895aefa9c6e0a34f6e0c",
                    "digestSigned": "WEt8qmGENVL0ZuQH+hs7qwSpB4sC9MS8Ju74tI3QZurSVsOx9E+gmxXqF6MOjZhktmFnzyNvMNIfdQ6dN22hDrj9rugU9UJN+6tbLI89XWA/1mEoVxF285HCDeLTrg2GalaWVxVrbaKK9yquF5D85ogqqLnaj/HK+d8PZePzr735hUUAKiTFMLLiLCXJIjzuiRdEUfAEU8voYIfbGu7ZT1lrSlthpXHyL3VxwIXoW9A8aSM8dgmpYav5RhzEvzM2JzTno64dd9iOYZl4DU0QEjrA0iDRJop26HDFNk07b5JJ+M/B4fatU3ztqycDPed8p4PoPHfjGgsrjyO1uWZ4gw==",
                    "key": {
                        "$id": "4b67636b8753d0e544342b4aa25c579f6487bf71",
                        "domain": "unstable.hookflash.me",
                        "service": "certificates"
                    }
                }
            },
            {
                "certificate": {
                    "$id": "626bd87a48429b131020ae88fc13cdaa3a6286ad",
                    "service": "identity",
                    "expires": 1393492926,
                    "key": {
                        "x509Data": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq4TOWOaAGYCChDpK3QhJ0h8Z6WltUQMdCa2paH/NxF3FbhKxPuoNZ8/DP++OdakQt2gmK7bc2ovPf8vVBnoYXB0My1QQaT2ABMFplm7nesJ/bHsnjdIZd9M6tZ8EdUTNAzqjS8ppx6nn2YK5e5qSGywfeX+H7ULKM4jFHypp36uzXP8mZUEIiCPoqvZHedI4g6Q4ADRDEhwKoa0omK3UP+8KQ6Ly8jpKM/aH9RFVSvwho2BIS3DoM27kApxTN9nqPkOIapJ12qQ44E0DtjQjMiTFAxyvgWOuTZ4IirQ4jtE29Q9GW4djfAB0ZKIx/rDrmwz/fomdvbS4A0vPMimxQQIDAQAB"
                    }
                },
                "signature": {
                    "reference": "#626bd87a48429b131020ae88fc13cdaa3a6286ad",
                    "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
                    "digestValue": "4a3b1c6fbbc9d732c3142bbf6bca1dbbd087e85c",
                    "digestSigned": "Jdlhn2N4HNA05czIIzsdWmuHJylLNYOZP4m7xHM2zGzxVu9AnKbgUqRR77HlGTLbMJtTpiS4kSt9cQKU3ZfBU538eTEQm0sXgCScKTCc7g/kK2PGu7dmVz5lSSmQKt9dgT+olmO/BaQ9U1yaa+IDCsSjCYtDC6tRT/9AZJ7Qo6EcXOx+BRJGvzNBboIVWOlinNONFf0bRBfCQHkIrS4URoT97kv1ZUT554wAkVyVt8mksD2XAFCsNZUF4zrlG9LQLeZhKo/p7me+sJsRDmMRUwhaw6qIgtddLmVr1nidRx5ekLUzTsA0wSgfhznXJyrlIJUkiCurwrHV+qppVe7ydg==",
                    "key": {
                        "$id": "4b67636b8753d0e544342b4aa25c579f6487bf71",
                        "domain": "unstable.hookflash.me",
                        "service": "certificates"
                    }
                }
            },
            {
                "certificate": {
                    "$id": "1c2fbe84248ea37d82d217ff975f7735c08fdad7",
                    "service": "identity-lookup",
                    "expires": 1393492927,
                    "key": {
                        "x509Data": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAozJs6m+ZrJDyj4dunKSEbXDQ/Onmf8EoIwrGRXS38iBLjoWAh3t4JTEMO/MVKdaxorwkLcYf+MzECjn2YhtUEAC5hi+qbNj4reJLE87Ra4RQ+JOs14VmSE7mvgL30sfexuTf3bBjt88kHenvQqhSMKT3jfRzJbfFYqQfWD6og5W91iTKQo4IWhQdmzYffEmTIp1cqNBvcn6+1gxG5y7Fnk/14wsOp2hWuOfXnePB1O4WEYrQMI5KfHekpmeRVuWGJNvL0kueSuhx2ZVjRpHjqEytVwioOr3O4jRQ43d5hjidGLjVsO3k6mpohYG2uFJMeHLVnUCz7L1Y1+WfiJzYgwIDAQAB"
                    }
                },
                "signature": {
                    "reference": "#1c2fbe84248ea37d82d217ff975f7735c08fdad7",
                    "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
                    "digestValue": "25fc49f95ceb66ebd892315eabec0194fd2e33bc",
                    "digestSigned": "TjUUIVoJamd6bt5PUJS8Q36kW8BT8Akc063LwzAJlsCM0BW8jK2nt8vjNI2LKXcpqbiaA8r2aWKbbvbm3Gms+ZFI0pQiXvoH0K0gdu2KsHFXnnybgU3jcTk63ZCnCU4EieU0Hj2HeoVLSYnHNZgawTXHMn9Iw++D2ta08OpT+j92+tVUq3r+2hj+zlB3cti6r/5gvokVkWEbjAPIssXabBXYHtJjgcAePqoza74d6md65ju4+jWDhIxhYCH2R4myRWj4WhQF2mi9lYEJughcv1vbF/h+JYHgwN5YhL7VIzLNN1XLqQ7mAT/m6mvRZe99/6PIPTI3WbCu9ZFWoVsxcg==",
                    "key": {
                        "$id": "4b67636b8753d0e544342b4aa25c579f6487bf71",
                        "domain": "unstable.hookflash.me",
                        "service": "certificates"
                    }
                }
            },
            {
                "certificate": {
                    "$id": "57eb7db7b44c4afde02182beb9f69ae14928b1ba",
                    "service": "peer-contact",
                    "expires": 1393492928,
                    "key": {
                        "x509Data": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxze5OzQVWlhE9zrY5t08YUy6imyg4rmu+3DbLLu9Lm1YZmMqZ9q6OeAuCbd8yOGkV5LEmbRiSoCi/O+gXAnHOvW6dfx2pah7xyJOfKA9ukukg/f3/Sr8c761jZNfHLxrNZXpStoNbapeGoWMHCn+GlbsrY1uIuCsDnhhAw/qGlkYujxJBD5hhCQerGEOTdP/WvZjUkpMTnwP0Qu/kBl1mRrBrGn31xTqKoyn36cw5pvdjk9y7Uc0eUr3tZOhDmgiYjEGzrgCtVst6hreUNpfEHkJPLiCoMJPQd00hsqmSPPMp4g3OrusLzNdiWce6peLvWHpLy1B+UcM37MgU00zaQIDAQAB"
                    }
                },
                "signature": {
                    "reference": "#57eb7db7b44c4afde02182beb9f69ae14928b1ba",
                    "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
                    "digestValue": "ecdea387ecf18000234b6f2394cdc77ec335a3ac",
                    "digestSigned": "GDDtHS6H7VzUaMBUcWMg2G99xOoQVRtRdAlO9+KG6HS9KlPBZIsTwlDobIR22ycO3TPTN50yIfC+vzecjW1mASsFaEH2Cy9p6Irh3HbN4wa/tKAll1Rp+LcUA7NMLyf3wrQYbYSP3dirkY0abOj7JrTGor3Hyiq/Bro5PHcK58wnEHJ78aElNhg0wf715m5w8K73nJGXvngsCabpR69EJSiD+ltNhebciw/nM8X6LBV92AziD0xTPXB+JshJdmAmlRNtsnEUX0UVd8ZE+M3RNErtUVvKRFWuGWRT+BVZPL/gvhsZbOUhmBo1ISDIh7JeCvVeFx0TEg5G6NlIG9/+fQ==",
                    "key": {
                        "$id": "4b67636b8753d0e544342b4aa25c579f6487bf71",
                        "domain": "unstable.hookflash.me",
                        "service": "certificates"
                    }
                }
            }
        ]));
	} else
	if (request.$handler === "bootstrapped-finders" && request.$method === "finders-get") {
		return callback(null, SERVICE.nestResponse(["finders", "finderBundle"], {
            "finder": {
                "$id": "c14de2cad95b5b9ce000933d74b20cc6a2c0e275",
                "protocols": {
                    "protocol": {
                        "transport": "websocket",
                        "srv": "localhost:3002"
                    }
                },
                "key": {
                    "x509Data": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwIw4uEJG3QAeL/sq7hFfqVhCMyOPOM8TwsN0qZ/AxyJ6DbCl8fY27hSqcnzbDvotMBnGzZRLcQ9n/6/9CREIutTqgC11MWTLBr1AZPz4TliWy3RIhJGYw7ddKkmuIiYfkShBV1k2paXoX4wWdEtUgzT73Ts4RrSmN0rG1fw7ttzHtYdmP6Un3SdGixHUsXdeh4/GE18zTkq7uzV3OrmaFYat8XL9mBz2SAGOl8Bn8lpRZ2rXDju4NNy18mHmaUQ34lnetk3DoVEBvaIVEJzqhzAJ4xj9s2HZ14lgtK38W/2mKjZ0RRtTtFoPFW8c3qp+o74tGnkObSZPD2KiMvoDsQIDAQAB"
                },
                "priority": 0,
                "weight": 10,
                "region": "1",
                "created": 1366113803,
                "expires": 1397649803
            },
            "signature": {
                "reference": "#c14de2cad95b5b9ce000933d74b20cc6a2c0e275",
                "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
                "digestValue": "781d2cf7b5d1211646e3d74b404967e672337313",
                "digestSigned": "VKpocgPlI08sj565cgTBtfc6Giw+x5jclQFgm+hbLg8q7X1oumKAbTBVuybZkCvI6FDZ3BsCIHAUxUvIMW5BgluwdGGzmliiIQ/ers/O/ozBSOWdcnj4vSgsU9k9bC4OFM8Hk7F7bVg6edmNAq8H3IVrrAEZr8spx5HCKAuXhJ+FurRsLXTpdCk2EGH06/qEb+H4zSert3P/GgSY07diOWkqqePLqi8GbkXFf8V+r06RVN2vL1WPX2FGELnUWTrmADIsGOJ1iDjtH86xWZjEmoVaZyLv3pfulqbsqGWLerktNlBo0aJ2knzESqKRXIE0GuTzRxmQ3qoj0BAqEMh7pg==",
                "key": {
                    "$id": "8d6062d23e84e9cd5f18134ba9531a48bd45fbab",
                    "domain": "unstable.hookflash.me",
                    "service": "bootstrapped-finders"
                }
            }
		}));
	} else
	if (request.$handler === "bootstrapper" && request.$method === "services-get") {

        request.$domain = IDENTITY_HOST;

        function handleResult(err, response, body) {
            if (err) return callback(err);

            if (response.statusCode !== 200) {
                return callback(new Error("Got status code '" + response.statusCode + "' while calling 'https://" + IDENTITY_HOST + "/.well-known/openpeer-services-get'"));
            }
            try {
                var data = JSON.parse(body);

                ASSERT(typeof data.result === "object");

                if (data.result.error) {

                    if (data.result.error['$id'] === 302) {

                        var url = data.result.error['location'];

                        return REQUEST({
                            method: "POST",
                            url: url,
                            body: JSON.stringify({
                                request: request
                            }),
                            headers: {
                                "Content-Type": "application/json"
                            },
                            rejectUnauthorized: false
                        }, handleResult);

                    } else {
                        return callback(new Error("Got error over openpeer wire: " + JSON.stringify(data.result.error)));
                    }
                }

                ASSERT(typeof data.result.services === "object");
                ASSERT(typeof data.result.services.service === "object");
                for (var i=0 ; i<data.result.services.service.length ; i++) {

                    var service = data.result.services.service[i];

                    if (service.type === "identity-lockbox" || service.type === "namespace-grant" || service.type === "rolodex") {
                        data.result.services.service.splice(i, 1);
                        i--;
                        continue;
                    }

                    if (!Array.isArray(service.methods.method)) {
                        service.methods.method = [ service.methods.method ];
                    }
                    service.methods.method = service.methods.method.map(function(method) {
                        if (
                            method.name === "finders-get" ||
                            method.name === "signed-salt-get" ||
                            method.name === "certificates-get" ||
                            method.name === "identity-access-inner-frame"
                        ) {
                            return method;
                        }
                        method.uri = "http://" + options.host + "/.helpers/" + method.name;
                        return method;
                    });

                    if (service.type === "identity") {
                        service.methods.method = service.methods.method.filter(function(method) {
                            if (method.name === "identity-lookup-update") return false;
                            if (method.name === "identity-access-lockbox-update") return false;
                            if (method.name === "identity-access-rolodex-credentials-get") return false;
                            return true;
                        });
                        service.methods.method.push({
                            name: "identity-lookup-update",
                            uri: "http://" + options.host + "/.helpers/identity-lookup-update"
                        });
                        service.methods.method.push({
                            name: "identity-access-lockbox-update",
                            uri: "http://" + options.host + "/.helpers/identity-access-lockbox-update"
                        });
                        service.methods.method.push({
                            name: "identity-access-rolodex-credentials-get",
                            uri: "http://" + options.host + "/.helpers/identity-access-rolodex-credentials-get"
                        });
                    } else
                    if (service.type === "identity-lookup") {
                        service.methods.method = service.methods.method.filter(function(method) {
                            if (method.name === "identity-lookup") return false;
                            return true;
                        });
                        service.methods.method.push({
                            name: "identity-lookup",
                            uri: "http://" + options.host + "/.helpers/identity-lookup"
                        });
                    }
                }
                data.result.services.service.push({
                    type: "identity-lockbox",
                    methods: {
                        method: [
                            {
                                name: "lockbox-access",
                                uri: "http://" + options.host + "/.helpers/lockbox-access"
                            },
                            {
                                name: "lockbox-identities-update",
                                uri: "http://" + options.host + "/.helpers/lockbox-identities-update"
                            },
                            {
                                name: "lockbox-content-set",
                                uri: "http://" + options.host + "/.helpers/lockbox-content-set"
                            },
                            {
                                name: "lockbox-content-get",
                                uri: "http://" + options.host + "/.helpers/lockbox-content-get"
                            },
                            {
                                name: "lockbox-namespace-grant-challenge-validate",
                                uri: "http://" + options.host + "/.helpers/lockbox-namespace-grant-challenge-validate"
                            }
                        ]
                    }
                });
                data.result.services.service.push({
                    type: "namespace-grant",
                    methods: {
                        method: [
                            {
                                name: "namespace-grant-start",
                                uri: "http://" + options.host + "/.helpers/namespace-grant-start"
                            }
                        ]
                    }
                });
                data.result.services.service.push({
                    type: "rolodex",
                    methods: {
                        method: [
                            {
                                name: "rolodex-access",
                                uri: "http://" + options.host + "/.helpers/rolodex-access"
                            },
                            {
                                name: "rolodex-namespace-grant-challenge-validate",
                                uri: "http://" + options.host + "/.helpers/rolodex-namespace-grant-challenge-validate"
                            },
                            {
                                name: "rolodex-contacts-get",
                                uri: "http://" + options.host + "/.helpers/rolodex-contacts-get"
                            }
                        ]
                    }
                });
                return callback(null, data.result);
            } catch(err) {
                return callback(err);
            }
        }

        return REQUEST({
            method: "POST",
            url: "https://" + IDENTITY_HOST + "/.well-known/openpeer-services-get",
            body: JSON.stringify({
                request: request
            }),
            headers: {
                "Content-Type": "application/json"
            },
            rejectUnauthorized: false
        }, handleResult);
    } else
    if (request.$handler === "bootstrapper" && request.$method === "services-get-dev") {
		return callback(null, SERVICE.nestResponse(["services", "service"], [
            {
                "$id": "b1ad4a059d4726f563b2fb04ed061ed5b909c66b",
                "type": "bootstrapper",
                "version": "1.0",
                "methods": {
                    "method": {
                        "name": "services-get",
                        "uri": "http://" + options.host + "/services-get"
                    }
                }
            },
            {
                "$id": "4b67636b8753d0e544342b4aa25c579f6487bf71",
                "type": "certificates",
                "version": "1.0",
                "methods": {
                    "method": {
                        "name": "certificates-get",
                        "uri": "http://" + options.host + "/.helpers/certificates-get"
                    }
                }
            },
            {
                "$id": "8d6062d23e84e9cd5f18134ba9531a48bd45fbab",
                "type": "bootstrapped-finders",
                "version": "1.0",
                "methods": {
                    "method": {
                        "name": "finders-get",
                        "uri": "http://" + options.host + "/.helpers/finders-get"
                    }
                }
            },
            {
                "$id": "ce833a6a40ceab77d288643ec9c2a81df9f0db12",
                "type": "salt",
                "version": "1.0",
                "methods": {
                    "method": {
                        "name": "signed-salt-get",
                        "uri": "http://" + options.host + "/.helpers/signed-salt-get"
                    }
                }
            },
            {
                "$id": "626bd87a48429b131020ae88fc13cdaa3a6286ad",
                "type": "identity",
                "version": "1.0",
                "methods": {
                    "method": [
                        {
                            "name": "identity-associate",
                            "uri": "http://" + options.host + "/.helpers/identity-associate"
                        },
                        {
                            "name": "identity-login-start",
                            "uri": "http://" + options.host + "/.helpers/identity-login-start"
                        },
                        {
                            "name": "identity-login-complete",
                            "uri": "http://" + options.host + "/.helpers/identity-login-complete"
                        },
                        {
                            "name": "identity-sign",
                            "uri": "http://" + options.host + "/.helpers/identity-sign"
                        },
                        {
                            "name": "identity-login-validate",
                            "uri": "http://" + options.host + "/.helpers/identity-login-validate"
                        },
                        {
                            "name": "identity-access-inner-frame",
                            "uri": "http://" + options.host + "/.helpers/identity-access-inner-frame"
                        },
                        {
                            "name": "identity-lookup-update",
                            "uri": "https://" + options.host + "/.helpers/identity-lookup-update"
                        },
                        {
                            "name": "identity-access-lockbox-update",
                            "uri": "https://" + options.host + "/.helpers/identity-access-lockbox-update"
                        },
                        {
                            "name": "identity-access-rolodex-credentials-get",
                            "uri": "https://" + options.host + "/.helpers/identity-access-rolodex-credentials-get"
                        }
                    ]
                }
            },
            {
                "$id": "1c2fbe84248ea37d82d217ff975f7735c08fdad7",
                "type": "identity-lookup",
                "version": "1.0",
                "methods": {
                    "method": [
                        {
                            "name": "identity-lookup-check",
                            "uri": "https://" + options.host + "/.helpers/identity-check"
                        },
                        {
                            "name": "identity-lookup",
                            "uri": "http://" + options.host + "/.helpers/identity-lookup"
                        }
                    ]
                }
            },
            {
                "$id": "d0b528b3f8e66455d154b1deac1e357e",
                "type": "namespace-grant",
                "version": "1.0",
                "methods": {
                    "method": [
                        {
                            "name": "namespace-grant-start",
                            "uri": "http://" + options.host + "/.helpers/namespace-grant-start"
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
                            "uri": "http://" + options.host + "/.helpers/lockbox-access"
                        },
                        {
                            "name": "lockbox-identities-update",
                            "uri": "http://" + options.host + "/.helpers/lockbox-identities-update"
                        },
                        {
                            "name": "lockbox-content-get",
                            "uri": "http://" + options.host + "/.helpers/lockbox-content-get"
                        },
                        {
                            "name": "lockbox-content-set",
                            "uri": "http://" + options.host + "/.helpers/lockbox-content-set"
                        },
                        {
                            "name": "lockbox-namespace-grant-challenge-validate",
                            "uri": "http://" + options.host + "/.helpers/lockbox-namespace-grant-challenge-validate"
                        }
                    ]
                }
            },
            {
                "$id": "d0b528b3f8e66455d154b1deac1e357e",
                "type": "rolodex",
                "version": "1.0",
                "methods": {
                    "method": [
                        {
                            "name": "rolodex-access",
                            "uri": "http://" + options.host + "/.helpers/rolodex-access"
                        },
                        {
                            "name": "rolodex-namespace-grant-challenge-validate",
                            "uri": "http://" + options.host + "/.helpers/rolodex-namespace-grant-challenge-validate"
                        },
                        {
                            "name": "rolodex-contacts-get",
                            "uri": "http://" + options.host + "/.helpers/rolodex-contacts-get"
                        }                        
                    ]
                }
            }
        ]));
	}
	return callback(null, null);
}
