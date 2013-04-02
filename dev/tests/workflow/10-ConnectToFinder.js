
define([
  'opjs/stack/util',
  'opjs/OpenPeer'
], function(Util, OpenPeer) {

  suite("Connect", function() {

    test('one client', function(done) {

      var client = new OpenPeer({
        deviceID: Util.randomHex(32)
      });

      client.ready().then(function() {

        client.destroy().then(function() {

          done(null);
       
        }, done);
      });
    });

    test('two clients', function(done) {

      var client1 = new OpenPeer({
        deviceID: Util.randomHex(32)
      });
      var client2 = new OpenPeer({
        deviceID: Util.randomHex(32)
      });

      client1.ready().then(function() {
        client2.ready().then(function() {

          client1.destroy().then(function() {
            client2.destroy().then(function() {

              done(null);

            }, done);
          }, done);
        });
      });
    });
  });

});
