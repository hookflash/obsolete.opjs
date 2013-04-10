var aes = require('cifre/aes');
var sha1 = require('cifre/sha1');
var rsa = require('cifre/rsa');
var RSAKey = rsa.RSAKey;

var key = new RSAKey();
process.stdout.write("Generating 2048bit RSA key...");
var before = Date.now();
key.generate(2048, "10001");
console.log(" (%sms)", Date.now() - before);




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


