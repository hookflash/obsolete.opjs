/* global suite, test, assert */
define([
  'opjs/ws'
], function (WS) {

  'use strict';

  suite('ws', function () {

    test('is an object', function () {
      assert.equal(typeof WS, 'function');
    });

    var ws = null;

    test('can connect', function (done) {
      ws = new WS("ws://localhost:3001");
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

  });
});
