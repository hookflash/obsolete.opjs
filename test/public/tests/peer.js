/* global suite, test, assert */
define(['opjs/stack/peer'], function (Peer) {

  'use strict';

  suite('Peer', function () {

    test('.isValid', function () {
      assert.isTrue(Peer.isValid('peer://domain.com/abcdef0123456789'));
      assert.isTrue(Peer.isValid('peer://sub.domain.com/abcdef0123456789'));
      assert.isFalse(Peer.isValid('peer//sub.domain.com/abcdef0123456789'));
      assert.isFalse(Peer.isValid('peer:/sub.domain.com/abcdef0123456789'));
      assert.isFalse(Peer.isValid('peer://domain.com/Abcdef0123456789'));
      assert.isFalse(Peer.isValid('peer://domain.com/abcdefg0123456789'));
      assert.isFalse(Peer.isValid('per://domain.com/abcdefg0123456789'));
    });

    test('.splitURI', function () {
      assert.deepEqual(Peer.splitURI('peer://domain.com/abc123'), {
        domain: 'domain.com',
        contactID: 'abc123'
      });
      assert.deepEqual(Peer.splitURI('peer://domain.c/om/abc123'), false);
    });
  });

});
