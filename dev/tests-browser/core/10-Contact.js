/* global define, suite, test, assert, HELPERS */
define([
  'opjs/OpenPeer',
  'opjs/assert',
  'opjs/util'
], function(OpenPeer, Assert, Util) {

	'use strict';

	suite('Contact', function() {

		this.timeout(10 * 1000);

		var op = null;

		test('init', function(done) {
			op = new OpenPeer({
				_logPrefix: "Contact",
				identity: "identity://" + Util.getHostname() + "/test-Contact"
			});
			return op.ready().then(function() {
				return done();
	        }).fail(done);
		});

		test('should be ready', function(done) {
			return op._core.ready().then(function() {
				Assert.equal(Q.isFulfilled(op._core._contact.ready()), true);
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