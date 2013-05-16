/*!markdown

Instanciate 2 clients and have them find each other.

*/
/* global define, suite, test, assert, HELPERS */
define([
  'opjs/util',
  'opjs/Stack'
], function(Util, Stack) {

  suite("FindPeer", function() {

    suite("two clients with one location each", function() {

      this.timeout(10 * 1000);

      var client1 = null;
      var client2 = null;

      test('connect', function() {

        client1 = new Stack({
          _logPrefix: "FindPeer (1)",
          identity: "identity://" + Util.getHostname() + "/test-FindPeer-1",
          _peerFilesForIdentity: HELPERS.peerFilesForIdentity,
          _debug: false,
          _verbose: true
        });
        client2 = new Stack({
          _logPrefix: "FindPeer (2)",
          identity: "identity://" + Util.getHostname() + "/test-FindPeer-2",
          _peerFilesForIdentity: HELPERS.peerFilesForIdentity,
          _debug: false,
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
        var count = 0;
        function checkCount() {
          count += 1;
          if (count === 3) {
            return done(null);
          }
        }
        client1._account.on("peer.new", function(peer) {
          return checkCount();
        });
        client2._account.on("peer.new", function(peer) {
          return checkCount();
        });
        return client1._account._finder.findPeer(client2._account._peerFiles.getContactID()).then(function(peer) {
          return checkCount();
        }).fail(done);
      });

      test('destroy', function(done) {
        var count = 0;
        function checkCount() {
          count += 1;
          if (count === 3) {
            return HELPERS.ensureNoConnections(done);
          }
        }
        client1._account.on("peer.destroyed", function(peer) {
          checkCount();
        });
        client2._account.on("peer.destroyed", function(peer) {
          checkCount();
        });
        return client1.destroy().then(function() {
          return client2.destroy().then(function() {
            return checkCount();
          });
        }).fail(done);
      });

    });

  });

});
