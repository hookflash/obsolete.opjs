var aes = require('cifre/aes');
var sha1 = require('cifre/sha1');
var rsa = require('cifre/rsa');
var RSAKey = rsa.RSAKey;
var BigInteger = rsa.BigInteger;
BigInteger.prototype.inspect = function () {
  return '0x' + this.toString(16);
};

var size = parseInt(process.argv[2]);
if (size !== size) throw new Error("Invalid key size");
var key = new RSAKey();
process.stdout.write("Generating " + size + "bit RSA key...");
var before = Date.now();
key.generate(size, "10001");
console.log(" (%sms)", Date.now() - before);
console.log(key);
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
