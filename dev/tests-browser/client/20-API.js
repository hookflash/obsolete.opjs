/* global define, suite, test */
define([
  'opjs/OpenPeer',
  'opjs/Stack',
  'opjs/util'
], function(OpenPeer, Stack, Util) {

	'use strict';

	suite('API', function() {

		this.timeout(10 * 1000);

		suite('OpenPeer', function() {

			var op = null;

			test("when instanciated", function() {
				op = new OpenPeer({
					_logPrefix: "API - OpenPeer",
					identity: "identity://" + Util.getHostname() + "/test-API-OpenPeer"
				});
			});

			test("and ready", function(done) {
				return op.ready().then(done).fail(done);
			});

			test("should be an object", function() {
				assert.isObject(op);
			});

			suite('have properties', function() {
			});

			suite('have events', function() {
			});

			suite('have methods', function() {
				[
					"getContacts"
				].forEach(function(name) {
					test(name, function() {
						assert.isFunction(op[name]);
					});
				});
			});

			test("and finally destroy itself", function(done) {
		        return op.destroy().then(function() {
		          	return HELPERS.ensureNoConnections(done);
		        }).fail(done);
			});

		});
	});

});