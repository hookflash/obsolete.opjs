/* global define, suite, test, assert, HELPERS */
define([
  'opjs/OpenPeer',
  'opjs/Stack',
  'opjs/assert',
  'opjs/util'
], function(OpenPeer, Stack, Assert, Util) {

	'use strict';

	suite('Init', function() {

		this.timeout(10 * 1000);

		suite('OpenPeer', function() {

			test('should be a function', function() {
				assert.isFunction(OpenPeer);
			});

			suite('when instanciated', function() {

				test("should give us an object", function(done) {
					var op = new OpenPeer({
						_logPrefix: "Init - OpenPeer",
						identity: "identity://" + Util.getHostname() + "/test-Init-OpenPeer"
					});
					assert.isObject(op);
					return op.ready().then(function() {
				        return op.destroy().then(function() {
				          	return HELPERS.ensureNoConnections(done);
				        });
			        }).fail(done);
  				});
			});

		});

		suite('Stack', function() {

			test('should be a function', function() {
				assert.isFunction(Stack);
			});

			suite('when instanciated', function() {

				test("should give us an object", function(done) {
					var stack = new Stack({
						_logPrefix: "Init - Stack",
						identity: "identity://" + Util.getHostname() + "/test-Init-Stack"
					});
					assert.isObject(stack);
					return stack.ready().then(function() {
				        return stack.destroy().then(function() {
				          	return HELPERS.ensureNoConnections(done);
				        });
			        }).fail(done);
				});
			});

		});
	});

});