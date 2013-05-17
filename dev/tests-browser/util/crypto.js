/* global define, suite, test, assert */
define([
  'opjs/util',
  'opjs/assert',
  'opjs/crypto',
  'cifre/forge/pki'
], function (Util, Assert, Crypto, PKI) {

  PKI = PKI();

  'use strict';

  suite('crypto', function() {

    test('generate 128 bit key pair', function(done) {

  	  var pair = Crypto.generateKeyPair(128);

  	  Assert.equal(PKI.privateKeyToPem(pair.privateKey).indexOf("-----BEGIN RSA PRIVATE KEY-----"), 0);
  	  Assert.equal(PKI.publicKeyToPem(pair.publicKey).indexOf("-----BEGIN PUBLIC KEY-----"), 0);

  	  return done(null);
    });

    test("generate 1028 bit", function(done) {

      var secret = Util.randomHex(32);

      var size = 1028;
      var domain = "example.com";
      var saltBundle = {
          real: 'salt',
          data: 'goes',
          here: true
      };
      var identityBundle = [
          "real",
          "identities",
          "go",
          "here"
      ];
      var salt = Util.randomHex(32);
      var findSecret = 'YjAwOWE2YmU4OWNlOTdkY2QxNzY1NDA5MGYy';
      var message = "Happiness is the object and design of your existence " +
                    "and will be the end thereof, if you pursue the path " +
                    "that leads to it.";

      var pair = Crypto.generateKeyPair(size);

      var signature = Crypto.sign(pair.privateKey, message);

      //console.log("Signature:", signature);

      var publicPeerFile = Crypto.generatePublicPeerFile({
        lifetime: 10845400, // Number of seconds till the file expires
        saltBundle: saltBundle,
        findSecret: findSecret,
        identityBundle: identityBundle,
        privateKey: pair.privateKey,
        publicKey: pair.publicKey,
        domain: domain
      });

      var contact = publicPeerFile.contact;

      //console.log(JSON.stringify(publicPeerFile, null, 4));

      var privatePeerFile = Crypto.generatePrivatePeerFile({
        contact: contact,
        salt: salt,
        secret: secret,
        privateKey: pair.privateKey,
        publicPeerFile: publicPeerFile,
        data: message
      });

      //console.log(JSON.stringify(privatePeerFile, null, 4));

      var privatePeerInfo = Crypto.parsePrivatePeerFile(privatePeerFile, {
          secret: secret
      });

      Assert.equal(privatePeerInfo.contact, contact);
      Assert.equal(privatePeerInfo.salt, salt);
      Assert.equal(Crypto.privateKeyToPem(privatePeerInfo.privateKey), Crypto.privateKeyToPem(pair.privateKey));
      Assert.equal(Crypto.publicKeyToPem(privatePeerInfo.publicKey), Crypto.publicKeyToPem(pair.publicKey));
      Assert.equal(privatePeerInfo.data, message);
      Assert.equal(privatePeerInfo.publicPeerFile, JSON.stringify(publicPeerFile));

      return done(null);
    });

  });

});