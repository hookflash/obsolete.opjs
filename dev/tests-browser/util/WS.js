/* global define, suite, test, assert */
define([
  'opjs/ws',
  'opjs/context'
], function (WS, Context) {

  'use strict';

  suite('ws', function () {

    test('is an object', function () {
      assert.equal(typeof WS, 'function');
    });

    var ws = null;

    test('can connect', function (done) {
      ws = new WS(new Context(), "ws://localhost:3001");
      ws.on("open", function() {
        return done(null);
      });
    });

    test('can send messages', function (done) {
      ws.on('message', function(message) {
        assert.equal(message, 'echo:message1');
        return done(null);
      });
      ws.send('message1');
    });

    test('can close', function (done) {
      ws.on('close', function() {
        return done(null);
      });
      ws.close();
    });

    suite('#connectTo()', function() {

      test('returns promise and eventually resolves', function (done) {
        return WS.connectTo(new Context(), 'ws://localhost:3001').then(function(ws) {
          ws.on('message', function(message) {
            assert.equal(message, 'echo:message1');
            ws.once('close', function() {
              return done(null);
            });
            ws.close();
          });
          ws.send('message1');
        }).fail(done);
      });

      test('returns promise and eventually rejects on connect fail', function (done) {
        return WS.connectTo(new Context(), 'ws://localhost:-3001').then(function(ws) {
          throw new Error("should never resolve");
        }, function(err) {
            return done(null);
        }).fail(done);
      });
    });

  });
});