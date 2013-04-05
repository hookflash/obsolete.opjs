/*!markdown

Instanciate 1+ clients and have them connect to finder service.

Test is successful if clients are deemed to be connected to finder service.

*/
define([
  'opjs/util',
  'opjs/Stack'
], function(Util, Stack) {

  suite("Connect", function() {

    test('one client', function(done) {

      var client = new Stack({
        deviceID: Util.randomHex(32)
      });

      client.ready().then(function() {

        client.destroy().then(function() {

          done(null);
       
        }, done);
      }, done);
    });

    test('two clients', function(done) {

      var client1 = new Stack({
        deviceID: Util.randomHex(32)
      });
      var client2 = new Stack({
        deviceID: Util.randomHex(32)
      });

      client1.ready().then(function() {
        client2.ready().then(function() {

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
