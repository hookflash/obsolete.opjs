/* global define, suite, test, assert */
define([
  'opjs/Stack',
  'opjs/util'
], function (Stack, Util) {

  'use strict';

return;
  suite('AccountFinder-Live', function () {

    this.timeout(10 * 1000);

    suite('Session', function() {

      test('connect', function(done) {

        var client = new Stack({
          _dev: false,
          _debug: true,
          _logPrefix: "AccountFinder-Live - connect",
          identity: "identity://facebook.com/",
          identityHost: Util.getHost(),
          identityDomain: "idprovider-javascript.hookflash.me"
        });
        return client.ready().then(function() {
          return client.destroy().then(function() {
            return done(null);
          });
        }).fail(done);
      });
    });
return;
    suite('Session Keepalive', function() {

      var client = null;

      test('connect', function(done) {
        client = new Stack({
          _dev: false,
          _debug: true,
          _logPrefix: "AccountFinder-Live - Session Keepalive",
          identity: "identity://unstable.hookflash.me/test-AccountFinder-Live-SessionKeepalive",
          identityHost: Util.getHost(),
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
