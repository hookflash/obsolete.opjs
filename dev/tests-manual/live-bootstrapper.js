
const ASSERT = require("assert");
const REQUEST = require("request");

const VERBOSE = false;


describe("live-bootstrapper", function() {

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#BootstrapperServiceRequests-LocatingTheBootstrapper
    it("should call `https://unstable.hookflash.me/.well-known/openpeer-services-get`", function(done) {

    	this.timeout(10 * 1000);

        if (VERBOSE) console.log("https://unstable.hookflash.me/.well-known/openpeer-services-get");

    	return REQUEST({
    		method: "POST",
    		url: "https://unstable.hookflash.me/.well-known/openpeer-services-get",
    		body: JSON.stringify({
				"$domain": "unstable.hookflash.me",
				"$appid": "xyz123",
				"$id": "abc123",
				"$handler": "bootstrapper",
				"$method": "services-get"
			})
    	}, function(err, response) {
    		if (err) return done(err);
            try {

                var payload = JSON.parse(response.body);

                if (VERBOSE) console.log(response.headers);
                if (VERBOSE) console.log(JSON.stringify(payload, null, 4));

                ASSERT.equal(typeof payload, "object");
                ASSERT.equal(typeof payload.result, "object");
                ASSERT.equal(typeof payload.result.services, "object");
                ASSERT.equal(Array.isArray(payload.result.services.service), true);
                ASSERT.equal(payload.result.services.service.length > 0, true);

                return done(null);

            } catch(err) {
                return done(err);
            }
    	});
    });

    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#BootstrappedFinderServiceRequests-FindersGetRequest
    it("should call `https://unstable.hookflash.me/finders-get`", function(done) {

        this.timeout(10 * 1000);

        if (VERBOSE) console.log("https://unstable.hookflash.me/finders-get");

        return REQUEST({
            method: "POST",
            url: "https://unstable.hookflash.me/finders-get",
            body: JSON.stringify({
                "$domain": "unstable.hookflash.me",
                "$appid": "xyz123",
                "$id": "abc123",
                "$handler": "bootstrapper-finder",
                "$method": "finders-get",
                "servers": 1
            })
        }, function(err, response) {
            if (err) return done(err);
            try {

                var payload = JSON.parse(response.body);

                if (VERBOSE) console.log(response.headers);
                if (VERBOSE) console.log(JSON.stringify(payload, null, 4));

                ASSERT.equal(typeof payload, "object");
                ASSERT.equal(typeof payload.result, "object");
                ASSERT.equal(typeof payload.result.finders, "object");
                ASSERT.equal(typeof payload.result.finders.finderBundle, "object");

                return done(null);

            } catch(err) {
                return done(err);
            }
        });
    });

    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#CertificatesServiceRequests-CertificatesGetRequest
    it("should call `https://unstable.hookflash.me/certificates-get`", function(done) {

        this.timeout(10 * 1000);

        if (VERBOSE) console.log("https://unstable.hookflash.me/certificates-get");

        return REQUEST({
            method: "POST",
            url: "https://unstable.hookflash.me/certificates-get",
            body: JSON.stringify({
                "$domain": "unstable.hookflash.me",
                "$appid": "xyz123",
                "$id": "abc123",
                "$handler": "certificates",
                "$method": "certificates-get"
            })
        }, function(err, response) {
            if (err) return done(err);
            try {

                var payload = JSON.parse(response.body);

                if (VERBOSE) console.log(response.headers);
                if (VERBOSE) console.log(JSON.stringify(payload, null, 4));

                ASSERT.equal(typeof payload, "object");
                ASSERT.equal(typeof payload.result, "object");
                ASSERT.equal(typeof payload.result.certificates, "object");
                ASSERT.equal(Array.isArray(payload.result.certificates.certificateBundle), true);
                ASSERT.equal(payload.result.certificates.certificateBundle.length > 0, true);

                return done(null);

            } catch(err) {
                return done(err);
            }
        });
    });

    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerSaltServiceProtocol-SignedSaltGetRequest
    it("should call `https://unstable.hookflash.me/signed-salt-get`", function(done) {

        this.timeout(10 * 1000);

        if (VERBOSE) console.log("https://unstable.hookflash.me/signed-salt-get");

        return REQUEST({
            method: "POST",
            url: "https://unstable.hookflash.me/signed-salt-get",
            body: JSON.stringify({
                "$domain": "unstable.hookflash.me",
                "$appid": "xyz123",
                "$id": "abc123",
                "$handler": "peer-salt",
                "$method": "signed-salt-get",
                "salts": 2
            })
        }, function(err, response) {
            if (err) return done(err);
            try {

                var payload = JSON.parse(response.body);

                if (VERBOSE) console.log(response.headers);
                if (VERBOSE) console.log(JSON.stringify(payload, null, 4));

                ASSERT.equal(typeof payload, "object");
                ASSERT.equal(typeof payload.result, "object");
                ASSERT.equal(typeof payload.result.salts, "object");
                ASSERT.equal(Array.isArray(payload.result.salts.saltBundle), true);
                ASSERT.equal(payload.result.salts.saltBundle.length > 0, true);

                return done(null);

            } catch(err) {
                return done(err);
            }
        });
    });

});
