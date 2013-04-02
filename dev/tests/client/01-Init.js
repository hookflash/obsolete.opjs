
define(['opjs/OpenPeer'], function(OpenPeer) {

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

	});

});
