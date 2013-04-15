
const ASSERT = require("assert");
const REQUEST = require("request");


describe("live-bootstrapper", function() {

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#BootstrapperServiceRequests-LocatingTheBootstrapper
    it("should call `https://unstable.hookflash.me/.well-known/openpeer-services-get`", function(done) {

    	this.timeout(10 * 1000);

    	return REQUEST({
    		method: "post",
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

                console.log(response.headers);
                console.log(JSON.stringify(payload, null, 4));

                ASSERT.equal(typeof payload, "object");
                ASSERT.equal(typeof payload.result, "object");
                ASSERT.equal(typeof payload.result.services, "object");
                ASSERT.equal(Array.isArray(payload.result.services.service), true);

                return done(null);

            } catch(err) {
                return done(err);
            }
    	});

    });

});
