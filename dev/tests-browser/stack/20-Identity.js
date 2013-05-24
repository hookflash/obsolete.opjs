/* global define, suite, test, assert, HELPERS */
define([
  'opjs/Stack',
  'q/q',
  'opjs/assert',
  'opjs/util',
  'opjs/ws',
  'opjs/context'
], function (Stack, Q, Assert, Util, WS, Context) {

  'use strict';

  suite('Identity', function () {

    this.timeout(10 * 1000);

    var identity = "identity://" + Util.getHostname() + "/test-identity";
    var client = null;

    test('connect', function(done) {
      client = new Stack({
        identity: identity,
        _logPrefix: "Identity"
      });
      return client.ready().then(function() {
        return done(null);
      }).fail(done);
    });

    test('lookup own', function(done) {
      return client._account._identity.lookup().then(function(identities) {
        Assert.isArray(identities);
        Assert(identities.length > 0);
        Assert.isObject(identities[0]);
        Assert.equal(identities[0].uri, identity);
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
