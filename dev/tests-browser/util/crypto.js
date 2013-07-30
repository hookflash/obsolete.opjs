/* global define, suite, test, assert */
define([
  'opjs/util',
  'opjs/assert',
  'opjs/crypto',
  'cifre/forge/pki',
  'cifre/forge/sha256',
  'cifre/aes',
  'cifre/forge/util',
  'cifre/utils',
  'cifre/md5',
  'cifre/forge/aes'
], function (Util, Assert, Crypto, PKI, SHA256, AES, FORGE_UTIL, UTILS, MD5, FORGE_AES) {

  PKI = PKI();
  SHA256 = SHA256();
  FORGE_UTIL = FORGE_UTIL();
  FORGE_AES = FORGE_AES();

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

      var publicPeerInfo = Crypto.parsePublicPeerFile(publicPeerFile);

      Assert.equal(publicPeerInfo.saltBundle, saltBundle);
      Assert.equal(publicPeerInfo.contact, contact);
      Assert.equal(publicPeerInfo.findSecret, findSecret);
      Assert.equal(publicPeerInfo.identityBundle, identityBundle);
      Assert.equal(Crypto.publicKeyToPem(publicPeerInfo.publicKey), Crypto.publicKeyToPem(pair.publicKey));

      return done(null);
    });

    suite('rolodex token', function() {

      test('sha256', function() {

        var data = "MY-DATA";

        var md = SHA256.create();
        md.start();
        md.update(data);

        Assert.equal(md.digest().toHex(), "cb80e9b520439d5e1d0eac4e6f6d4ac70b33ba962765a7af02dddafe1b1ee0e6");
      });

      test('aes', function() {

        function arrayToAscii(array) {
          var string = "";
          for (var i = 0, l = array.length; i < l; i++) {
            string += String.fromCharCode(array[i]);
          }
          return string;
        }

        function sha256(data) {
          var md = SHA256.create();
          md.start();
          md.update(data);
          return md.digest().toHex();
        }

        function md5(data) {
          return UTILS.tohex(MD5(UTILS.stringToArray(data)));
        }

        function encrypt(key, iv, data) {
          var state = UTILS.stringToArray(data);
          AES.cfb.encrypt(state, AES.keyExpansion(UTILS.fromhex(key)), UTILS.fromhex(iv));
          return UTILS.tohex(state);
        }

        function decrypt(key, iv, data) {
          var state = UTILS.fromhex(data);
          AES.cfb.decrypt(state, AES.keyExpansion(UTILS.fromhex(key)), UTILS.fromhex(iv));
          return arrayToAscii(state);
        }

        var key = sha256("01234567890123456789012345678901");
console.log("key", key);
        var iv = md5("0123456789012345");
console.log("iv", iv);
        var data = 'MY-DATA-AND-HERE-IS-MORE-DATA';

console.log("encrypted", encrypt(key, iv, data));
console.log("decrypted", decrypt(key, iv, encrypt(key, iv, data)));

// NOTE: This is the implementation compatible with JS cifre.
console.log("decrypted from PHP", decrypt(key, iv, "80eb666a9fc9e263faf71e87ffc94451d7d8df7cfcf2606470351dd5ac"));

console.log("decrypted from FORGE", decrypt(key, iv, "80eb666a9fc9e263faf71e87ffc94451d7d8df7cfcf2606470351dd5ac3f70bd"));


// encrypt some bytes using CFB mode
var cipher = FORGE_AES.createEncryptionCipher(FORGE_UTIL.hexToBytes(key), 'CFB');
cipher.start(FORGE_UTIL.hexToBytes(iv));
cipher.update(FORGE_UTIL.createBuffer(data));
cipher.finish();
var encrypted = cipher.output;
// outputs encrypted hex
console.log("forge aes encrypted", encrypted.toHex());

cipher = FORGE_AES.createDecryptionCipher(FORGE_UTIL.hexToBytes(key), 'CFB');
cipher.start(FORGE_UTIL.hexToBytes(iv));
cipher.update(FORGE_UTIL.createBuffer(FORGE_UTIL.hexToBytes(encrypted.toHex())));
cipher.finish();
console.log("forge aes decrypted", cipher.output.toString());

cipher = FORGE_AES.createDecryptionCipher(FORGE_UTIL.hexToBytes(key), 'CFB');
cipher.start(FORGE_UTIL.hexToBytes(iv));
cipher.update(FORGE_UTIL.createBuffer(FORGE_UTIL.hexToBytes("80eb666a9fc9e263faf71e87ffc94451d7d8df7cfcf2606470351dd5ac")));
cipher.finish();
console.log("forge aes decrypted from cifre", cipher.output.toString());


key = sha256("klksd9887w6uysjkksd89893kdnvbter");

console.log("decrypted 2", decrypt(key, "02a5391832e67364ee1751c37d87a9e9", "bec2245a9f366d85ca3f3520f54b27843f509d6813ca8af1621aab061579b131c68d424730b5fa9a89289e70320121f9fb38a428f75592c5aa5402cac042d311b1a8e0af5ea38afc6554d531c135379aa3ad0b936d70930d99c31478cfdd0d3a87996a7cad74c6b27de08dbe6116457520a0082d7c3dec96dbb7ab35b8905bfff8e71084f6ea205034424007f2fc703109f716621d5272e181d2ffa01723741d0ea50938a67d5049d2ad"));



      });

    });

  });

});
