/* global define, suite, test, assert */
define([
  'opjs/p2p-relay-client',
  'opjs-primitives/context'
], function (RelayClient, Context) {

  'use strict';

  suite('p2p-relay-client', function () {

    test('is an object', function () {
      assert.equal(typeof RelayClient, 'function');
    });

    var client = null;

    test('can connect', function (done) {
      client = new RelayClient(new Context(), "ws://localhost:3000");
      client.connect("SECRET1");
      client.on("open", function() {
        return done(null);
      });
    });

    test('can disconnect', function (done) {
      client.on('disconnected', function() {
        return done(null);
      });
      client.disconnect();
    });

    test('can connect two clients', function (done) {

      var secret = "SECRET2";

      var client1 = new RelayClient(new Context(), "ws://localhost:3000");
      var client2 = new RelayClient(new Context(), "ws://localhost:3000");

      var count = 0;
      function connected() {
        count += 1;
        if (count === 2) {
          client2.on("message", function(message) {
            assert.equal(message, "message1");
            client2.disconnect();
          });
          client1.send("message1");
        }
      }
      client1.on("connected", connected);
      client2.on("connected", connected);
      client1.connect(secret);
      client2.connect(secret);
      client1.on("close", function() {
        return done(null);        
      });
    });

  });
});