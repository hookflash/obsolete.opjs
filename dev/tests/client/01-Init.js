
define([
  'opjs/OpenPeer',
  'opjs/Stack'
], function(OpenPeer, Stack) {

	'use strict';

	suite('Init', function() {

		suite('OpenPeer', function() {

			test('should be a function', function() {
				assert.isFunction(OpenPeer);
			});

			suite('when instanciated', function() {

				test("should give us an object", function() {
					assert.isObject(new OpenPeer());
				});

			});

		});

		suite('Stack', function() {

			test('should be a function', function() {
				assert.isFunction(Stack);
			});

			suite('when instanciated', function() {

				test("should give us an object", function() {
					assert.isObject(new Stack());
				});

			});

		});

	});

});
