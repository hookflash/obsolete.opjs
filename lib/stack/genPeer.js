var aes = require('cifre/aes');
var sha1 = require('cifre/sha1');
var rsa = require('cifre/rsa');
var derEncode = require('cifre/der').encode;

var RSAKey = rsa.RSAKey;

var size = parseInt(process.argv[2]);
if (size !== size) throw new Error("Invalid key size");
var key = new RSAKey();
process.stdout.write("Generating " + size + "bit RSA key...");
var before = Date.now();
key.generate(size, "10001");
console.log(" (%sms)", Date.now() - before);
var asn = [0, key.n, key.e, key.d, key.p, key.q, key.dmp1, key.dmq1, key.coeff];
var der = new Buffer(derEncode(asn));
console.log(asn);
console.log(der);

console.log(der.toString('base64'));

        

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
