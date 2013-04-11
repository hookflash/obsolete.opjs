/*!markdown

Instanciate 1+ clients and have them connect to finder service.

Test is successful if clients are deemed to be connected to finder service.

*/
define([
  'opjs/util',
  'opjs/Stack'
], function(Util, Stack) {

  suite("ConnectToFinder", function() {

    suite("one client", function() {

      var client = null;

      test('connect', function(done) {
        var client1 = new Stack();
        return client1.ready().then(function() {
          client = client1;
          return done(null);
        }, done);
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

      test('destroy', function(done) {
        return client.destroy().then(function() {
          return done(null);
        }, done);
      });

    });

    suite("two client", function() {

      test('connect and destroy', function(done) {

        var client1 = new Stack({
          deviceID: Util.randomHex(32)
        });
        var client2 = new Stack({
          deviceID: Util.randomHex(32)
        });

        client1.ready().then(function() {

          assert.equal(client1._account._finder.isConnected(), 1);

          client2.ready().then(function() {

            assert.equal(client2._account._finder.isConnected(), 1);

            client1.destroy().then(function() {
              client2.destroy().then(function() {

                done(null);

              }, done);
            }, done);
          }, done);
        }, done);
      });
    });
   
  });

});
