/* global define, suite, test, assert */
define([
  'opjs/util',
  'opjs/assert',
  'opjs/crypto',
  'cifre/forge/pki'
], function (Util, Assert, Crypto, PKI) {

  'use strict';

  suite('crypto', function() {

    test('generate 1028 bit key pair', function(done) {

  	  var pair = Crypto.generateKeyPair(1028);

  	  Assert.equal(PKI.privateKeyToPem(pair.privateKey).indexOf("-----BEGIN RSA PRIVATE KEY-----"), 0);
  	  Assert.equal(PKI.publicKeyToPem(pair.publicKey).indexOf("-----BEGIN PUBLIC KEY-----"), 0);

  	  return done(null);
    });

  });

});