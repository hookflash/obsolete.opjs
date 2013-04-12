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
  // Insert $id if none is found
  if (!message.$id) {
    message = merge({$id: randomID()}, message);
  }
  var id = message.$id;

  // Sort the keys while encoding as json.
  var json = sortedStringify(message);
  // And digest the message using SHA1
  var md = sha1.create();
  md.start();
  md.update(json);

  var bundle = {};
  bundle[name] = message;
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

function sortedStringify(object) {
  // TEMPORARY shortcut to not sort keys.
  return JSON.stringify(object);
  // TODO: uncomment the next line when we are ready to sort keys
  // return JSON.stringify(sortedReplacer(null, object), sortedReplacer);
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

// Merge object b into object a, returning object a
function merge(a, b) {
  Object.keys(b).forEach(function (key) {
    a[key] = b[key];
  });
  return a;
}

/**
 * @param sections is an object containing A, B, and/or C objects
 * 
 * "A" contains "cipher", "created", "expires", and "saltBundle"
 * "B" if it exists, contains "findSecret"
 * "C" if it exists, contains "identities"
 *
 * @param keyPair is an rsa key pair with publicKey and privateKey properties.
 * @param domain is the domain to use in the peer contact URI
 */
function publicPeerFile(sections, keyPair, domain) {
  var sectionBundle = [];
  if (!sections.A) {
    throw new Error("Section A is required");
  }
  var A = merge({ $id: 'A' }, sections.A);
  sectionBundle.push(bundle('section', A, keyPair.privateKey, {
    x509Data: binaryToBase64(asn1.toDer(pki.publicKeyToAsn1(keyPair.publicKey)).getBytes())
  }));

  var md = sha1.create();
  md.start();
  md.update('contact:' + sortedStringify(A));
  var contactUri = 'peer://' + domain + '/' + md.digest().toHex();
  
  if (sections.B) {
    sectionBundle.push(bundle('section', merge({
      $id: 'B',
      contact: contactUri
    }, sections.B), keyPair.privateKey, {
      uri: contactUri
    }));
  }

  if (sections.C) {
    sectionBundle.push(bundle('section', merge({
      $id: 'C',
      contact: contactUri
    }, sections.C), keyPair.privateKey, {
      uri: contactUri
    }));
  }

  return {
    peer: {
      $version: "1",
      sectionBundle: sectionBundle
    }
  };
}

function privatePeerFile() {
}

var now = Math.floor(Date.now() / 1000);
var pub = publicPeerFile({
  A: {
    cipher: 'sha256/aes256',
    created: now,
    expires: now + 10845400,
    saltBundle: {
      real: 'salt',
      data: 'goes',
      here: true
    }
  },
  B: { findSecret: 'YjAwOWE2YmU4OWNlOTdkY2QxNzY1NDA5MGYy' },
  C: { identities: { identityBundle: [ "real", "identities", "go", "here" ] } }
}, pair, "example.com");
console.log(require('util').inspect(pub, {depth: null, colors: true}));
