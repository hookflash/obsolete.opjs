/*!markdown

Instanciate 2 clients and have them send messages back and forth.

Test is successful if messages are received and replied to.

*/
/* global define, suite, test, assert, HELPERS */
define([
  'opjs/util',
  'opjs/Stack'
], function(Util, Stack) {

  suite("SendMessageToPeer", function() {

    suite("two clients with one location each", function() {

      this.timeout(10 * 1000);

      var client1 = null;
      var client2 = null;

      test('connect', function() {

        client1 = new Stack({
          _logPrefix: "FindPeer (1)",
          identity: "identity://" + Util.getHostname() + "/test-SendMessageToPeer-1",
          _p2pRelayHost: "localhost:3000",
          _debug: true,
          _verbose: true
        });
        client2 = new Stack({
          _logPrefix: "FindPeer (2)",
          identity: "identity://" + Util.getHostname() + "/test-SendMessageToPeer-2",
          _p2pRelayHost: "localhost:3000",
          _debug: true,
          _verbose: true
        });
      });

      test('connected', function(done) {
        return client1.ready().then(function() {
          return client2.ready().then(function() {

            return done(null);
          });
        }).fail(done);
      });

      test('find peer', function(done) {
        var peer2 = null;
        client2._account.on("peer.new", function(peer) {
          peer2 = peer;
        });
        return client1._account._finder.findPeer("identity://" + Util.getHostname() + "/test-SendMessageToPeer-2").then(function(peer1) {
          peer2.on("message", function(location, message) {
            assert.deepEqual(message, {
              from: "client1",
              message: "Hello World"
            });
            peer2.sendMessage({
              from: "client2",
              message: "Hello World"
            });
          });
          peer1.on("message", function(location, message) {
            assert.deepEqual(message, {
              from: "client2",
              message: "Hello World"
            });
            return done(null);
          });
          peer1.sendMessage({
            from: "client1",
            message: "Hello World"
          });
        }).fail(done);
      });

      test('destroy', function(done) {
        return client1.destroy().then(function() {
          return client2.destroy().then(function() {
            return HELPERS.ensureNoConnections(done);
          });
        }).fail(done);
      });

    });

  });

});
