/* global define, suite, test, assert */
define([
  'opjs/Stack'
], function (Stack) {

  'use strict';

  suite('AccountFinder-Live', function () {

    this.timeout(10 * 1000);

    test('connect', function(done) {

      var client = new Stack({
        _dev: false,
        _debug: true,
        _logPrefix: "AccountFinder-Live - connect",
        identity: "identity://unstable.hookflash.me/test-AccountFinder-Live",
        _peerFilesForIdentity: HELPERS.peerFilesForIdentity
      });
      return client.ready().then(function() {
        return client.destroy().then(function() {
          return done(null);
        });
      }).fail(done);
    });

  });

});
