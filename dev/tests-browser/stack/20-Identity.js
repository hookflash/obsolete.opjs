/* global define, suite, test, assert, HELPERS */
define([
  'opjs/Stack',
  'q/q',
  'opjs-primitives/assert',
  'opjs-primitives/util',
  'opjs-primitives/ws',
  'opjs-primitives/context'
], function (Stack, Q, Assert, Util, WS, Context) {

  'use strict';

  suite('Identity', function () {

    this.timeout(10 * 1000);
/*
    suite('Identity - None', function () {

      test('connect & destroy', function(done) {
        var client = new Stack({
          _logPrefix: "Identity - None"
        });
        return client.ready().then(function() {
          return client._account._bootstrapper.ready().then(function() {
            if (!client._account._identity) {
              return client.destroy().then(function() {
                return HELPERS.ensureNoConnections(done);
              }).fail(done);
            }
          });
        }).fail(done);
      });

    });
*/

    suite('Identity - Single', function () {

      var identity = "identity://" + Util.getHostname() + "/test-identity-single";
      var client = null;

      test('connect', function(done) {
        client = new Stack({
          identity: identity,
          _logPrefix: "Identity - Single",
          appid: 'com.hookflash.testapp'
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

/*
    suite('Identity - Add One', function () {

      test('connect & destroy', function(done) {
        var client = new Stack({
          _logPrefix: "Identity - Add One"
        });
        return client.ready().then(function() {
          if (!client._account._identity) {
            return client.addIdentity("identity://" + Util.getHostname() + "/test-identity-add-one").then(function() {
              return client.destroy().then(function() {
                return HELPERS.ensureNoConnections(done);
              });
            }).fail(done);
          }
        }).fail(done);
      });

    });

    suite('Identity - Add Two', function () {

      test('connect & destroy', function(done) {
        var client = new Stack({
          _logPrefix: "Identity - Add Two"
        });
        return client.ready().then(function() {
          if (!client._account._identity) {
            return client.addIdentity("identity://" + Util.getHostname() + "/test-identity-add-two-1").then(function() {
              return client.addIdentity("identity://" + Util.getHostname() + "/test-identity-add-two-2").then(function() {
                return client.destroy().then(function() {
                  return HELPERS.ensureNoConnections(done);
                });
              });
            }).fail(done);
          }
        }).fail(done);
      });

    });
*/
  });


});
