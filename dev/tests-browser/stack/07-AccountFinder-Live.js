/* global define, suite, test, assert */
define([
  'opjs/Stack'
], function (Stack) {

  'use strict';

  suite('AccountFinder-Live', function () {

    this.timeout(10 * 1000);

    test('connect', function(done) {

return done(null);

      var client = new Stack({
        _dev: false,
        _debug: true,
        _logPrefix: "AccountFinder-Live - connect",
        "domain": "unstable.hookflash.me"
      });
      return client.ready().then(function() {
        return client.destroy().then(function() {
          return done(null);
        });
      }).fail(done);
    });

  });

});
