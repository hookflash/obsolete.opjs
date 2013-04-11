
const REQUEST = require("request");


describe("live-bootstrapper", function() {

	// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#BootstrapperServiceRequests-LocatingTheBootstrapper
    it("should call `https://unstable.hookflash.me/.well-known/openpeer-services-get`", function(done) {

    	this.timeout(10 * 1000);

    	return REQUEST({
    		method: "post",
    		url: "https://unstable.hookflash.me/.well-known/openpeer-services-get",
    		body: JSON.stringify({
				"$domain": "example.com",
				"$appid": "xyz123",
				"$id": "abc123",
				"$handler": "bootstrapper",
				"$method": "services-get"
			})
    	}, function(err, response) {
    		if (err) return done(err);

console.log("response", response);

    		return done(null);
    	});

    });

});
