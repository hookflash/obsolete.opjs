/* global define, suite, test, assert, HELPERS */
define([
	'opjs/OpenPeer',
	'opjs-primitives/assert',
	'opjs-primitives/util'
], function(OpenPeer, Assert, Util) {

	suite('Contact', function() {

		if (navigator.userAgent.indexOf("PhantomJS") >= 0) {
			test("tests disabled when running via PhantomJS for now. TODO: Fix. Seems to have to do with identity login.");
			return;
		}

		this.timeout(10 * 1000);

		var op = null;

		test('init', function(done) {
			op = new OpenPeer({
				_logPrefix: "Contact",
				appid: 'com.hookflash.testapp',
				identity: "identity://" + Util.getHostname() + "/test-Contact"
			});
			return op.ready().then(function() {
				return done();
			}).fail(done);
		});

		test('should fetch contacts', function(done) {
			return op.getContacts().then(function(contacts) {

				var readyPromise = op._core._contact.ready();
				var readyState = readyPromise.inspect();
				Assert.equal(readyState.state, "fulfilled");

				Assert.isObject(contacts);
				Assert.isObject(contacts["identity://foo.com/alice"]);
				done();
			}).fail(done);
		});

		test('destroy', function(done) {
			return op.destroy().then(function() {
				return HELPERS.ensureNoConnections(done);
			}).fail(done);
		});
	});

});