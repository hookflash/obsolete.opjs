/* global suite, test, assert */
define([
  'opjs/stack/message/MessageRequest'
], function (MessageRequest) {

  'use strict';

  suite('MessageRequest', function () {

    // A placeholder just to ensure the Require.js pathing is correct
    test('Exposes a function', function () {
      assert.equal(typeof MessageRequest, 'function');
    });
  });
});
