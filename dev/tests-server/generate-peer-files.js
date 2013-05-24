
const PATH = require('path');
const FS = require('fs');
const ASSERT = require('assert');

const Crypto = require("../../lib/crypto");
const Util = require("../../lib/util");

describe("generate-peer-files", function() {

    var secret = null;
    var findSecret = null;
    var contact = null;

    it("generate 1028 bit", function(done) {

        secret = Util.randomHex(32);

        var size = 1028;
        var domain = "example.com";
        var saltBundle = {
            "salt": {
                "$id": "c5f568521a24c5baf618d1ada3b8e300fdc963e0",
                "#text": "432d09beaed2b7bd392a73c8c3dddf86098981bc"
            },
            "signature": {
                "reference": "#c5f568521a24c5baf618d1ada3b8e300fdc963e0",
                "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
                "digestValue": "0a0f158931d9e6abe2e3d99a7841242762a86feb",
                "digestSigned": "by5doZ5jRK12qi4lIFUdeHpYR7ta3AUesWQX0Odr9nUL9MsdJTyccLeZMXFt2dcQKtfIyzOwFkpUbQuH7IFB4JLgPnGkJW/WfEggGxisTSDr+CYi3NU0hStWDvC+m6OLXjQAOc0PeI3ketUSXcEiNukkOvxuBlflbE0Zf7/zXejG+9L6Ve/0z3eKsJ487gyjhPhGxgLoGb1G6+3jWNvBubUqVhYac3hVMvI95zIkZg44T25gnuEwKfXpkfKRZRptbuk1Dq6StA52ZBKn1xQM8z3akPj9CPLcSTW3Rb+CiG3tgyRxBl7nYBaJeGDWNxtF0B9ttBY46AV69ugrdJlRbA==",
                "key": {
                    "$id": "5d4e02f0800c0f354a72b2983914ca409ce6cf0c",
                    "domain": "unstable.hookflash.me",
                    "service": "salt"
                }
            }
        };
        var identityBundle = [
            {
                "identity": {
                    "$id": "b5dfaf2d00ca5ef3ed1a2aa7ec23c2db",
                    "contact": "peer://example.com/ab43bd44390dabc329192a392bef1",
                    "uri": "identity://facebook.com/id48483",
                    "created": 54593943,
                    "expires": 65439343
                },
                "signature": {
                    "reference": "#b5dfaf2d00ca5ef3ed1a2aa7ec23c2db",
                    "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
                    "digestValue": "IUe324koV5/A8Q38Gj45i4jddX=",
                    "digestSigned": "MDAwMDAwMGJ5dGVzLiBQbGVhc2UsIGQ=",
                    "key": {
                        "$id": "b7ef37...4a0d58628d3",
                        "domain": "hookflash.org",
                        "service": "identity"
                    }
                }
            }
        ];
        var salt = Util.randomHex(32);
        findSecret = 'YjAwOWE2YmU4OWNlOTdkY2QxNzY1NDA5MGYy';
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
        ASSERT.equal(Crypto.publicKeyToPem(privatePeerInfo.publicKey), Crypto.publicKeyToPem(pair.publicKey));
        ASSERT.equal(privatePeerInfo.data, message);
        ASSERT.equal(privatePeerInfo.publicPeerFile, JSON.stringify(publicPeerFile));

        var publicPeerInfo = Crypto.parsePublicPeerFile(publicPeerFile);

        ASSERT.equal(publicPeerInfo.saltBundle, saltBundle);
        ASSERT.equal(publicPeerInfo.contact, contact);
        ASSERT.equal(publicPeerInfo.findSecret, findSecret);
        ASSERT.equal(publicPeerInfo.identityBundle, identityBundle);
        ASSERT.equal(Crypto.publicKeyToPem(publicPeerInfo.publicKey), Crypto.publicKeyToPem(pair.publicKey));

        FS.writeFileSync(PATH.join(__dirname, "assets/public-from-JS.json"), JSON.stringify(publicPeerFile, null, 4));
        FS.writeFileSync(PATH.join(__dirname, "assets/private-from-JS.json"), JSON.stringify(privatePeerFile, null, 4));
        FS.writeFileSync(PATH.join(__dirname, "assets/private-from-JS.secret"), secret);

        return done(null);
    });

    it("parse from JS", function(done) {

        var publicPeerFile = JSON.parse(FS.readFileSync(PATH.join(__dirname, "assets/public-from-JS.json")));
        var privatePeerFile = JSON.parse(FS.readFileSync(PATH.join(__dirname, "assets/private-from-JS.json")));

        var privatePeerInfo = Crypto.parsePrivatePeerFile(privatePeerFile, {
            secret: secret
        });

        ASSERT.equal(privatePeerInfo.contact, contact);
        ASSERT.equal(privatePeerInfo.publicPeerFile, JSON.stringify(publicPeerFile));

        var publicPeerInfo = Crypto.parsePublicPeerFile(publicPeerFile);

        ASSERT.equal(publicPeerInfo.contact, contact);
        ASSERT.equal(publicPeerInfo.findSecret, findSecret);

        return done(null);
    });

    it("parse from C", function(done) {
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
