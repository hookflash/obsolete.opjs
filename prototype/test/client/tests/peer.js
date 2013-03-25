define(['modules/peer'], function(Peer) {
  'use strict';

  suite('Peer', function() {
    suite('#validate', function() {
      var peer;
      suiteSetup(function() {
        peer = new Peer();
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
