/*!markdown

Instanciate 1+ clients and have them connect to finder service.

Test is successful if clients are deemed to be connected to finder service.

*/
/* global define, suite, test, assert, HELPERS */
define([
  'opjs/util',
  'opjs/Stack',
  'opjs/assert'
], function(Util, Stack, Assert) {

  suite("ConnectToFinder", function() {

    this.timeout(10 * 1000);

    test('one client', function(done) {
      var client = new Stack({
        _logPrefix: "ConnectToFinder - one client",
        identity: "identity://" + Util.getHostname() + "/test-ConnectToFinder-one"
      });
      return client.ready().then(function() {
        return client.destroy().then(function() {
          return HELPERS.ensureNoConnections(done);
        });
      }).fail(done);
    });

    test('two clients', function(done) {

      var client1 = new Stack({
        _logPrefix: "ConnectToFinder - two clients (1)",
        identity: "identity://" + Util.getHostname() + "/test-ConnectToFinder-two-1"
      });
      var client2 = new Stack({
        _logPrefix: "ConnectToFinder - two clients (2)",
        identity: "identity://" + Util.getHostname() + "/test-ConnectToFinder-two-2"
      });

      return client1.ready().then(function() {

        assert.equal(client1._account._finder.isConnected(), 1);

        return client2.ready().then(function() {

          assert.equal(client2._account._finder.isConnected(), 1);

          return client1.destroy().then(function() {
            return client2.destroy().then(function() {
              return HELPERS.ensureNoConnections(done);
            });
          });
        });
      }).fail(done);
    });
   
  });

});
