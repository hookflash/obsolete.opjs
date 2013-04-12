/* global suite, test, assert, beforeEach */
define([
  'opjs/Stack',
  'q/q'
], function (Stack, Q) {

  'use strict';

  suite('AccountFinder', function () {

    var client = null;

    test('connect', function(done) {
      client = new Stack();
      return client.ready().then(function() {
        return done(null);
      });
    });

    test('reconnect after finder closes connection', function(done) {
      assert.equal(client._account._finder.isConnected(), 1);
      return HELPERS.callServerHelper("finder-server/close-all-connections", {}, function(err) {
        // Wait a bit for connection to drop and reconnect.
        setTimeout(function() {
          assert.equal(client._account._finder.isConnected(), 2);
          return done(null);
        }, 100);
      });
    });

    test('try multiple finders until success', function(done) {
      client._bootstrapper.getFinders = function() {
        return Q.resolve([
          // Send one bad url to test connection to multiple finders until one works.
          {
            wsUri: "ws://localhost:-3002"
          },
          {
            wsUri: "ws://localhost:3002"
          }
        ]);
      };
      assert.equal(client._account._finder.isConnected(), 2);
      return HELPERS.callServerHelper("finder-server/close-all-connections", {}, function(err) {
        // Wait a bit for connection to drop and reconnect.
        setTimeout(function() {
          assert.equal(client._account._finder.isConnected(), 3);
          return done(null);
        }, 100);
      });
    });

    test('destroy', function(done) {
      return client.destroy().then(function() {
        return done(null);
      }, done);
    });

    suite('failures', function () {

      test('all finders down', function(done) {

        var client = new Stack();
        return client.ready().then(function() {

          client._bootstrapper.getFinders = function() {
            return Q.resolve([
              // Send one bad url to test connection to multiple finders until one works.
              {
                wsUri: "ws://localhost:-3002"
              },
              {
                wsUri: "ws://localhost:-3002"
              }
            ]);
          };

          assert.equal(client._account._finder.isConnected(), 1);
          return HELPERS.callServerHelper("finder-server/close-all-connections", {}, function(err) {
            // Wait a bit for connection to drop and reconnect.
            setTimeout(function() {
              assert.equal(client._account._finder.isConnected(), false);

              return client.destroy().then(function() {
                return done(null);
              }, done);
            }, 100);
          });

        });
      });

    });

  });

});
