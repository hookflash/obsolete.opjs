/* global define, suite, test, assert */
define([
  'opjs/Stack'
], function (Stack) {

  'use strict';

  suite('AccountFinder-Live', function () {

return;
    this.timeout(10 * 1000);

    suite('Session', function() {

      test('connect', function(done) {

        var client = new Stack({
          _dev: false,
          _debug: true,
          _logPrefix: "AccountFinder-Live - connect",
          identity: "identity://unstable.hookflash.me/test-AccountFinder-Live",
          identityHost: "provisioning-stable-dev.hookflash.me",
          _finderHost: "localhost:3092"
        });
        return client.ready().then(function() {
          return client.destroy().then(function() {
            return done(null);
          });
        }).fail(done);
      });
    });

    suite('Session Keepalive', function() {

      var client = null;

      test('connect', function(done) {
        client = new Stack({
          _dev: false,
          _debug: true,
          _logPrefix: "AccountFinder-Live - Session Keepalive",
          identity: "identity://unstable.hookflash.me/test-AccountFinder-Live-SessionKeepalive",
          identityHost: "provisioning-stable-dev.hookflash.me",
          _finderHost: "localhost:3092",
          _finderKeepalive: 1  // 1 second.
        });
        return client.ready().then(function() {
          return done(null);
        }).fail(done);
      });

      test('keepalive', function(done) {
        this.timeout(5 * 1000);
        var count = 0;
        client._account._finder.on("keepalive", function() {
          count += 1;
          if (count >= 2) {
            return done(null);
          }
        });
      });

      test('destroy', function(done) {
        return client.destroy().then(function() {
          return HELPERS.ensureNoConnections(done);
        }).fail(done);
      });

    });

  });

});
