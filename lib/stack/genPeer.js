var pki = require('cifre/forge/pki');
var sha1 = require('cifre/forge/sha1');
var rsa = require('cifre/forge/rsa');

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

//console.log(pair);
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
