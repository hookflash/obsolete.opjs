/*!markdown

Instanciate 2 clients and have them find each other.

*/
/* global define, suite, test, assert, HELPERS */
define([
  'opjs/util',
  'opjs/Stack'
], function(Util, Stack) {

  suite("FindPeer", function() {

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
//        locationID: Util.randomHex(32)
      });
      client2 = new Stack({
        _logPrefix: "FindPeer (2)",
        identity: "identity://" + Util.getHostname() + "/test-FindPeer-2",
        _peerFilesForIdentity: HELPERS.peerFilesForIdentity,
        _debug: false,
        _verbose: true        
//        locationID: Util.randomHex(32)
      });
    });

    test('connected', function(done) {
      return client1.ready().then(function() {
        return client2.ready().then(function() {

          return done(null);
        });
      }).fail(done);
    });

    var targetPeer = null;

    test('find peer', function(done) {

      return client1._account._finder.findPeer(client2._account._peerFiles.getContactID()).then(function(peer) {

        // TODO: Run test on `peer` to verify that peer is connected.

        return done(null);
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
