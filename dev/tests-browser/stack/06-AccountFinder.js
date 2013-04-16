/* global define, suite, test, assert, HELPERS */
define([
  'opjs/Stack',
  'q/q',
  'opjs/util',
  'opjs/ws',
  'opjs/context'
], function (Stack, Q, Util, WS, Context) {

  'use strict';

  suite('AccountFinder', function () {

    suite('Helper', function() {

      test('`ws://localhost:3002/session-create` and `ws://localhost:3002/session-delete`', function(done) {
        return WS.connectTo(new Context(), 'ws://localhost:3002').then(function(ws) {
          return ws.makeRequestTo("peer-finder", "session-create").then(function(result) {
            assert.isObject(result);
            assert.isNumber(result.expires);
            return ws.makeRequestTo("peer-finder", "session-delete", {
              "locations": {
                "location": {
                  "$id": Util.randomHex(32)
                }
              }
            }).then(function(result) {
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
        client = new Stack({
          _logPrefix: "AccountFinder - Session"
        });
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
        client._account._bootstrapper.getFinders = function() {
          return Q.resolve([
            // Send one bad url to test connection to multiple finders until one works.
            {
              "$id": Util.randomHex(32),
              "transport": "webSocket",
              "srv": "localhost:-3002"
            },
            {
              "$id": Util.randomHex(32),
              "transport": "webSocket",
              "srv": "localhost:3002"
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
          return HELPERS.ensureNoConnections(done);
        }).fail(done);
      });

    });

    suite('Session Keepalive', function() {

      var client = null;

      test('connect', function(done) {
        client = new Stack({
          _logPrefix: "AccountFinder - Session Keepalive"
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

    suite('failures', function () {

      test('all finders down', function(done) {

        var client = new Stack({
          _logPrefix: "AccountFinder - failures"
        });
        return client.ready().then(function() {
          client._account._bootstrapper.getFinders = function() {
            return Q.resolve([
              // Send one bad url to test connection to multiple finders until one works.
              {
                "$id": Util.randomHex(32),
                "transport": "webSocket",
                "srv": "localhost:-3002"
              },
              {
                "$id": Util.randomHex(32),
                "transport": "webSocket",
                "srv": "localhost:-3002"
              }
            ]);
          };
          assert.equal(client._account._finder.isConnected(), 1);
          return HELPERS.callServerHelper("finder-server/close-all-connections", {}, function(err) {
            if (err) return done(err);
            function destroy() {
              return client.destroy().then(function() {
                return HELPERS.ensureNoConnections(done);
              }).fail(done);
            }
            // Wait a bit for connection to drop.
            var waitCount = 0;
            var waitId = setInterval(function() {
              if (waitCount > 10) {
                clearInterval(waitId);
                assert.equal(client._account._finder.isConnected(), false);
                return destroy();
              }
              waitCount += 1;
              if (client._account._finder.isConnected() === false) {
                clearInterval(waitId);
                return destroy();
              }
            }, 100);
          });
        }).fail(done);
      });

    });

  });

});
