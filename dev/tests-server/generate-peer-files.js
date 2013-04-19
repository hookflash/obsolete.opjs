
const PATH = require('path');
const FS = require('fs');
const ASSERT = require('assert');

const Crypto = require("../../lib/crypto");
const Util = require("../../lib/util");

describe("generate-peer-files", function() {

    var secret = null;
    var contact = null;

    it("generate 1028 bit", function(done) {

        secret = Util.randomHex(32);

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

        contact = publicPeerFile.contact;

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

        ASSERT.equal(privatePeerInfo.contact, contact);
        ASSERT.equal(privatePeerInfo.salt, salt);
        ASSERT.equal(Crypto.privateKeyToPem(privatePeerInfo.privateKey), Crypto.privateKeyToPem(pair.privateKey));
        ASSERT.equal(privatePeerInfo.data, message);
        ASSERT.equal(privatePeerInfo.publicPeerFile, JSON.stringify(publicPeerFile));

        FS.writeFileSync(PATH.join(__dirname, "assets/public-from-JS.json"), JSON.stringify(publicPeerFile));
        FS.writeFileSync(PATH.join(__dirname, "assets/private-from-JS.json"), JSON.stringify(privatePeerFile));
        FS.writeFileSync(PATH.join(__dirname, "assets/private-from-JS.secret"), secret);

        return done(null);
    });

    it("parse private from JS", function(done) {

        var publicPeerFile = JSON.parse(FS.readFileSync(PATH.join(__dirname, "assets/public-from-JS.json")));
        var privatePeerFile = JSON.parse(FS.readFileSync(PATH.join(__dirname, "assets/private-from-JS.json")));

        var privatePeerInfo = Crypto.parsePrivatePeerFile(privatePeerFile, {
            secret: secret
        });

        ASSERT.equal(privatePeerInfo.contact, contact);
        ASSERT.equal(privatePeerInfo.publicPeerFile, JSON.stringify(publicPeerFile));

        return done(null);
    });

    it("parse private from C", function(done) {
return done(null);

        var publicPeerFile = JSON.parse(FS.readFileSync(PATH.join(__dirname, "assets/public-from-C.json")));
        var privatePeerFile = JSON.parse(FS.readFileSync(PATH.join(__dirname, "assets/private-from-C.json")));

        var privatePeerInfo = Crypto.parsePrivatePeerFile(privatePeerFile, {
            secret: "dTOA5xBEm60qkCqhlNDnibRaGUhMWUCzEXXePWftuUx5eanK9pWveyuAr1Oxqg64"
        });

        ASSERT.equal(privatePeerInfo.contact, publicPeerFile.contact);
        ASSERT.equal(privatePeerInfo.publicPeerFile, JSON.stringify(publicPeerFile));

        return done(null);
    });

});
