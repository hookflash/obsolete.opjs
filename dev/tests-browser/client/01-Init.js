
define([
  'opjs/OpenPeer',
  'opjs/Stack',
  'opjs/assert'
], function(OpenPeer, Stack, Assert) {

	'use strict';

	suite('Init', function() {

		suite('OpenPeer', function() {

			test('should be a function', function() {
				assert.isFunction(OpenPeer);
			});

			suite('when instanciated', function() {

				test("should give us an object", function(done) {
					var op = new OpenPeer({
						context: {
							logPrefix: "Init - OpenPeer"
						}
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
						context: {
							logPrefix: "Init - Stack"
						}
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
