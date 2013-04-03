/* global suite, test, assert */
define([
  'opjs/stack/message/peer-finder/PeerLocationFindRequest'
], function (PeerLocationFindRequest) {
  'use strict';

  suite('PeerLocationFindRequest', function () {

    // A placeholder just to ensure the Require.js pathing is correct
    test('Exposes a function', function () {
      assert.equal(typeof PeerLocationFindRequest, 'function');
    });
  });
});
