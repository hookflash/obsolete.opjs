/*!markdown

Instanciate 1+ clients and have them connect to finder service.

Test is successful if clients are deemed to be connected to finder service.

*/
define([
  'opjs/util',
  'opjs/Stack'
], function(Util, Stack) {

  suite("ConnectToFinder", function() {

    test('one client', function(done) {
      var client = new Stack();
      return client.ready().then(function() {
        return client.destroy().then(function() {
          return done(null);
        }, done);
      }, done);
    });

    test('two clients', function(done) {

      var client1 = new Stack({
        locationID: Util.randomHex(32)
      });
      var client2 = new Stack({
        locationID: Util.randomHex(32)
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
