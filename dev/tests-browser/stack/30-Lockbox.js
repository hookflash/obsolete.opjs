/* global define, suite, test, assert, HELPERS */
define([
  'opjs/Stack',
  'q/q',
  'opjs-primitives/assert',
  'opjs-primitives/util',
  'opjs-primitives/ws',
  'opjs-primitives/context'
], function (Stack, Q, Assert, Util, WS, Context) {

  suite('Lockbox', function () {

    this.timeout(10 * 1000);

    suite('Fresh', function () {

      var client = null;

      test('connect', function(done) {
        client = new Stack({
          identity: "identity://" + Util.getHostname() + "/test-lockbox-fresh",
          appid: 'com.hookflash.testapp',
          _logPrefix: "Lockbox - Fresh"
        });
        return client.ready().then(function() {
          return done(null);
        }).fail(done);
      });

      test('destroy', function(done) {
        return client.destroy().then(function() {
          return HELPERS.ensureNoConnections(done);
        }).fail(done);
      });
    });

    suite('Existing', function () {

      var client = null;

      test('connect', function(done) {
        client = new Stack({
          identity: "identity://" + Util.getHostname() + "/test-lockbox-existing",
          appid: 'com.hookflash.testapp',
          _logPrefix: "Lockbox - Existing"
        });
        return client.ready().then(function() {
          return done(null);
        }).fail(done);
      });
      test('destroy', function(done) {
        return client.destroy().then(function() {
          return HELPERS.ensureNoConnections(done);
        }).fail(done);
      });
    });

  });

});
