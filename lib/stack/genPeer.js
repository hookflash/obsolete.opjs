var pki = require('cifre/forge/pki');
var sha1 = require('cifre/forge/sha1');
var rsa = require('cifre/forge/rsa');
var asn1 = require('cifre/forge/asn1');

var size = parseInt(process.argv[2]);
if (size !== size) throw new Error("Invalid key size");

process.stdout.write("Generating " + size + "bit RSA key...");
var before = Date.now();
var pair = rsa.generateKeyPair(size, 0x10001);
console.log(" (%sms)", Date.now() - before);


console.log(pki.privateKeyToPem(pair.privateKey));
console.log(pki.publicKeyToPem(pair.publicKey));

var message = "Happiness is the object and design of your existence " +
              "and will be the end thereof, if you pursue the path " +
              "that leads to it.";
console.log("Message:", message);

var md = sha1.create();
md.start();
md.update(message);

var signature = new Buffer(pair.privateKey.sign(md), 'binary');
console.log("Signature:", signature.toString('base64'));


/**
 * OpenPeer bundle helper.  Takes a JSON object and signs it returning a JSON bundle
 *
 * @param name the JSON key to use for the original message.
 * @param message the message to sign.
 * @param key the RSA key to use to sign.
 * @param keyData extra data to put in the signature object.
 *
 * @return a new JSON object representing the signed bundle.
 */ 
function bundle(name, message, key, keyData) {
  var id = randomID();

  // Insert the $id at the top of the message
  var obj = {
    $id: id
  };
  Object.keys(message).forEach(function (key) {
    obj[key] = message[key];
  });

  // Sort the keys while encoding as json.
  var json = JSON.stringify(sortedReplacer(null, obj), sortedReplacer);
  // And digest the message using SHA1
  var md = sha1.create();
  md.start();
  md.update(json);

  var bundle = {};
  bundle[name] = obj;
  bundle.signature = {
    reference: '#' + id,
    algorithm: 'http://openpeer.org/2012/12/14/jsonsig#rsa-sha1',
    digestValue: binaryToBase64(md.digest().getBytes()),
    digestSigned: binaryToBase64(key.sign(md)),
    key: keyData
  };

  return bundle;
}

function binaryToBase64(binary) {
  // TODO: Implement this so it works in browsers too.
  return (new Buffer(binary, 'binary')).toString('base64')
}

function randomID() {
  var id = '';
  for (var i = 0; i < 5; i++) {
    var part = (Math.random() * 0x100000000).toString(16);
    id += '00000000'.substr(part.length) + part;
  }
  return id;
}

// Replacer callback for JSON.stringify that sorts object keys.
function sortedReplacer(key, value) {
  if (typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  // Sort object keys.
  var obj = {};
  Object.keys(value).sort().forEach(function (key) {
    obj[key] = value[key];
  });
  return obj;
}


console.log(bundle('section', {
  section: "stuff",
  goes: "here",
}, pair.privateKey, {
  x509Data: binaryToBase64(asn1.toDer(pki.publicKeyToAsn1(pair.publicKey)).getBytes())
}));

/*

function publicPeerFile(created, expires, salt) {
  
  return {
    peer: {
      $version: "1",
      sectionBundle: [
        bundle("section", {
          $id: "A",
          cipher: "sha256/aes256",
          created: created,
          expires: expires,
          saltBundle: bundle("salt", {
            "#text": salt
          })
        }),
        bundle("section", {
          $id: "B",
          contact: contactURI,
          findSecret: findSecret
        }),
        bundle("section", {
          $id: "C",
          contact: contactURI,
          identities: {
            identityBundle: identities.map(function (identity) {
              return bundle("identity", identity);
            })
          }
        })
      ]
    }
  };
  
}

*/
