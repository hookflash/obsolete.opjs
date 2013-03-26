define(['modules/peer'], function(Peer) {
  'use strict';

  suite('Peer', function() {

    suite('Model', function() {
      suite('#initialize', function() {
        test('Defines default connection options', function() {
          assert.ok((new Peer.Model()).connectOptions);
        });
        test('Accepts connection options as overrides', function() {
          var newOpts = {};
          var peer = new Peer.Model({ connectOptions: newOpts });
          assert.equal(peer.connectOptions, newOpts);
        });
      });
      suite('#validate', function() {
        var peer;
        suiteSetup(function() {
          peer = new Peer.Model();
        });
        test('Rejects unspecified string names', function() {
          assert.instanceOf(peer.validate(), Error);
          assert.instanceOf(peer.validate({ name: '' }), Error);
        });
        test('Rejects invalid names', function() {
          assert.instanceOf(peer.validate({ name: '!@#@#$' }), Error);
        });
      });
    });
  });
});
