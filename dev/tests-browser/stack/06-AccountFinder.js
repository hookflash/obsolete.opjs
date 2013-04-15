/* global suite, test, assert, beforeEach */
define([
  'opjs/Stack',
  'q/q',
  'opjs/util',
  'opjs/ws'
], function (Stack, Q, Util, WS) {

  'use strict';

  suite('AccountFinder', function () {

    suite('Helper', function() {

      WS.setContext({
        "appid": Util.randomHex(32)
      });

      test('`ws://localhost:3002/session-create` and `ws://localhost:3002/session-delete`', function(done) {
        return WS.connectTo('ws://localhost:3002').then(function(ws) {
          return ws.makeRequestTo("peer-finder", "session-create").then(function(result) {
            assert.isObject(result);
            assert.isNumber(result.expires);
            return ws.makeRequestTo("peer-finder", "session-delete").then(function(result) {
              assert.isObject(result);
              assert.isObject(result.locations);
              return done(null);
            });
          });
        }).fail(done);
      });

    });

    suite('Session', function() {

      var client = null;

      test('connect', function(done) {
        client = new Stack();
        return client.ready().then(function() {
          return done(null);
        }).fail(done);
      });

      test('reconnect after finder closes connection', function(done) {
        assert.equal(client._account._finder.isConnected(), 1);
        return HELPERS.callServerHelper("finder-server/close-all-connections", {}, function(err) {
          if (err) return done(err);
          // Wait a bit for connection to drop and reconnect.
          var waitCount = 0;
          var waitId = setInterval(function() {
            if (waitCount > 10) {
              clearInterval(waitId);
              assert.equal(client._account._finder.isConnected(), 2);
              return done(null);
            }
            waitCount += 1;
            if (client._account._finder.isConnected() === 2) {
              clearInterval(waitId);
              return done(null);
            }
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
          if (err) return done(err);
          // Wait a bit for connection to drop and reconnect.
          var waitCount = 0;
          var waitId = setInterval(function() {
            if (waitCount > 10) {
              clearInterval(waitId);
              assert.equal(client._account._finder.isConnected(), 3);
              return done(null);
            }
            waitCount += 1;
            if (client._account._finder.isConnected() === 3) {
              clearInterval(waitId);
              return done(null);
            }
          }, 100);
        });
      });

      test('destroy', function(done) {
        return client.destroy().then(function() {
          return done(null);
        }).fail(done);
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
              if (err) return done(err);
              // Wait a bit for connection to drop and reconnect.
              setTimeout(function() {
                assert.equal(client._account._finder.isConnected(), false);

                return client.destroy().then(function() {
                  return done(null);
                }).fail(done);
              }, 100);
            });

          }).fail(done);
        });

      });

    });

  });

});
