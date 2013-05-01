
if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
	'./util',
	'./assert',
	'cifre/forge/pki',
	'cifre/forge/sha1',
	'cifre/forge/rsa',
	'cifre/forge/asn1',
	'cifre/forge/hmac',
	'cifre/forge/util',
	'cifre/aes',
	'cifre/md5',
	'cifre/utils',
], function (Util, Assert, PKI, SHA1, RSA, ASN1, HMAC, FORGE_UTIL, AES, MD5, UTILS) {

	PKI = PKI();
	SHA1 = SHA1();
	RSA = RSA();
	ASN1 = ASN1();
	HMAC = HMAC();
	FORGE_UTIL = FORGE_UTIL();

	function generateKeyPair(size) {
        var pair = RSA.generateKeyPair(size, 0x10001);
        pair.privatePem = PKI.privateKeyToPem(pair.privateKey);
        pair.publicPem = PKI.publicKeyToPem(pair.publicKey);
		return pair;
    }

    function sign(privateKey, data) {
    	return FORGE_UTIL.encode64(privateKey.sign(calcSHA1(data)));
    }

	function parsePrivatePeerFile(privatePeerFile, args) {

	    var info = {
	        contact: null,
	        salt: null,
	        secretProof: null,
	        privateKey: null,
	        publicKey: null,
	        publicPeerFile: null,
	        data: null
	    };

	    function decrypt(prefix, data) {
	        var key = UTILS.fromhex(hmac(args.secret, prefix + info.salt).toHex());
	        var iv = MD5(prefix + info.salt);
	        var state = base64ToArray(data);
	        AES.cfb.decrypt(state, key, iv);
	        return state.map(function(code) {
	            return String.fromCharCode(code);
	        }).join('');
	    }

	    Assert.isObject(privatePeerFile);
	    Assert.isObject(privatePeerFile.privatePeer);
	    Assert.isArray(privatePeerFile.privatePeer.sectionBundle);
	    Assert.equal(privatePeerFile.privatePeer.sectionBundle.length, 2);
	    Assert.isObject(privatePeerFile.privatePeer.sectionBundle[0].section);
	    Assert.isObject(privatePeerFile.privatePeer.sectionBundle[1].section);

	    var A = privatePeerFile.privatePeer.sectionBundle[0].section;
	    // TODO: Verify signature of section.

	    info.salt = A.salt;

	    var B = privatePeerFile.privatePeer.sectionBundle[1].section;
	    // TODO: Verify signature of section.

	    info.contact =  decrypt('contact:', B.encryptedContact);
	    info.secretProof = hmac(args.secret, 'proof:' + info.contact).toHex();
	    if (info.secretProof !== A.secretProof) {
	        throw new Error("`secretProof` from `secret` (" + info.secretProof + ") does not match `secretProof` from file (" + A.secretProof + ")");
	    }
	    info.privateKey = PKI.privateKeyFromAsn1(ASN1.fromDer(decrypt('privatekey:', B.encryptedPrivateKey)));
	    info.publicKey = PKI.rsa.setPublicKey(info.privateKey.n, info.privateKey.e);
	    info.publicPeerFile =  decrypt('peer:', B.encryptedPeer);
	    if (B.encryptedPrivateData) {
	        info.data =  decrypt('data:', B.encryptedPrivateData);
	    }

	    return info;
	}

	function parsePublicPeerFile(publicPeerFile) {

		var info = {
			created: null,
			expires: null,
			saltBundle: null,
			contact: null,
			findSecret: null,
			identityBundle: null
		};

	    Assert.isObject(publicPeerFile);
	    Assert.isObject(publicPeerFile.peer);
	    Assert.isArray(publicPeerFile.peer.sectionBundle);
	    Assert(publicPeerFile.peer.sectionBundle.length >= 1);

	    var A = publicPeerFile.peer.sectionBundle[0];
	    // TODO: Verify `A.signature`

	    Assert.isNumber(A.section.created);
	    Assert.isNumber(A.section.expires);
	    Assert.isObject(A.section.saltBundle);

	    info.created = A.section.created;
	    info.expires = A.section.expires;
	    info.saltBundle = A.section.saltBundle;

		if (publicPeerFile.peer.sectionBundle.length === 1) return info;

	    var B = publicPeerFile.peer.sectionBundle[1];
	    // TODO: Verify `B.signature`

	    Assert.isString(B.section.contact);
	    Assert.isString(B.section.findSecret);

	    info.contact = B.section.contact;
	    info.findSecret = B.section.findSecret;

		if (publicPeerFile.peer.sectionBundle.length === 2) return info;

	    var C = publicPeerFile.peer.sectionBundle[2];
	    // TODO: Verify `C.signature`

	    if (
	    	C.section.identities &&
	    	C.section.identities.identityBundle
	    ) {
		    info.identityBundle = C.section.identities.identityBundle;
	    }

		return info;
	}

	/**
	 * OpenPeer bundle helper.  Takes a JSON object and signs it returning a JSON bundle
	 *
	 * @param name the JSON key to use for the original message.
	 * @param message the message to sign.
	 * @param key the RSA key to use to sign.
	 * @param keyData extra data to put in the signature object.
	 *
	 * @return a new JSON object representing the signed bundle.
	 *
	 * @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#GeneralRequestReplyNotifyAndResultFormationRules
	 */
	function signBundleForKeys(name, message, privateKey, publicKey) {
		return signBundle(name, message, privateKey, {
			x509Data: binaryToBase64(ASN1.toDer(PKI.publicKeyToAsn1(publicKey)).getBytes())
	    });
	}
	function signBundle(name, message, key, keyData) {
	  // Insert $id if none is found
	  if (!message.$id) {
	    message = merge({$id: randomID()}, message);
	  }
	  var id = message.$id;

	  // Sort the keys while encoding as json.
	  var json = sortedStringify(message);
	  // And digest the message using sha1
	  var md = SHA1.create();
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

	function calcSHA1(message) {
	    var md = SHA1.create();
	    md.start();
	    md.update(message);
	    return md;
	}

	function binaryToBase64(binary) {
		return FORGE_UTIL.encode64(binary);
	}

	function arrayToBase64(array) {
		return FORGE_UTIL.encode64(array.map(function(code) {
			return String.fromCharCode(code);
		}).join(''));
	}

	function base64ToArray(base64) {
	    var data = FORGE_UTIL.decode64(base64);
	    var length = data.length;
	    var state = new Array(length);
	    for (var i = 0; i < length; i++) {
	      state[i] = data.charCodeAt(i);
	    }
	    return state;
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
	 * @param args is an object hash of the named arguments.
	 *
	 *   "privateKey" - RSA private key used to sign bundles
	 *   "publicKey" - RSA public key stored in section A's signature
	 *   "domain" - domain to use in contactURI
	 *   "lifetime" - the number of seconds till this new file expires
	 *   "saltBundle" - the actual saltBundle
	 *   "findSecret" - Optional parameter that creates a section B
	 *   "identityBundle" - Optional list of identity bundles
	 *
	 * @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#TheMakeupOfThePublicPeerFile
	 */
	function generatePublicPeerFile(args) {
	  if (!args.privateKey) throw new Error("privateKey is required");
	  if (!args.publicKey) throw new Error("publicKey is required");
	  if (!args.domain) throw new Error("domain is required");
	  if (!args.lifetime) throw new Error("lifetime is required");
	  if (!args.saltBundle) throw new Error("saltBundle is required");
	  
	  var now = Math.floor(Date.now() / 1000);
	  var A = {
	    $id: 'A',
	    cipher: 'sha256/aes256',
	    created: now,
	    expires: now + args.lifetime,
	    saltBundle: args.saltBundle
	  };
	  var sectionBundle = [signBundle('section', A, args.privateKey, {
	    x509Data: binaryToBase64(ASN1.toDer(PKI.publicKeyToAsn1(args.publicKey)).getBytes())
	  })];

	  var contact = getContactUri(A, args.domain);
	  
	  if (args.findSecret) {
	    sectionBundle.push(signBundle('section', {
	      $id: 'B',
	      contact: contact,
	      findSecret: args.findSecret
	    }, args.privateKey, {
	      uri: contact
	    }));
	  }

	  // TODO: Only include section C if `args.identityBundle` is provided.
	  var C = {
	    $id: 'C',
	    contact: contact
	  };
	  if (args.identityBundle) {
	    C.identities = {
	      identityBundle: args.identityBundle
	    };
	  }
      sectionBundle.push(signBundle('section', C, args.privateKey, {
        uri: contact
      }));

	  // Store the contact uri in the result, but hidden behind a prototype.
	  var hidden = {
	    contact: contact
	  };
	  var result = Object.create(hidden);
	  result.peer = {
	    $version: "1",
	    sectionBundle: sectionBundle
	  }
	  return result;
	}

	function getContactUri(A, domain) {
	  var md = SHA1.create();
	  md.start();
	  md.update(sortedStringify(A));
	  return 'peer://' + domain + '/' + md.digest().toHex();
	}

	function hmac(secret, string) {
	    var hm = HMAC.create();
	    hm.start('sha256', secret);
	    hm.update(string);
	    return hm.getMac();
	}


	/**
	 * @param args is an object hash of the named arguments.
	 *   "contact" the contact URI
	 *   "salt" a random salt
	 *   "secret" a secret string used to encrypt the data and verify access
	 *   "privateKey" the RSA private key
	 *   "publicPeerFile" the public peer file
	 *   "data" Optional extra data
	 *
	 * @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#TheMakeupOfThePrivatePeerFile
	 */
	function generatePrivatePeerFile(args) {
	  if (!args.contact) throw new Error("contact is required");
	  if (!args.salt) throw new Error("salt is required");
	  if (!args.secret) throw new Error("secret is required");
	  if (!args.privateKey) throw new Error("privateKey is required");
	  if (!args.publicPeerFile) throw new Error("publicPeerFile is required");
	  
	  var sectionBundle = [signBundle('section', {
	    $id: 'A',
	    contact: args.contact,
	    cipher: 'sha256/aes256',
	    salt: args.salt,
	    secretProof: hmac(args.secret, 'proof:' + args.contact).toHex()
	  }, args.privateKey, {
	    uri: args.contact
	  })];

	  var pkcs = ASN1.toDer(PKI.privateKeyToAsn1(args.privateKey)).getBytes()
	  var B = {
	    $id: 'B',
	    encryptedContact: encrypt('contact:', args.contact),
	    encryptedPrivateKey: encrypt('privatekey:', pkcs),
	    encryptedPeer: encrypt('peer:', JSON.stringify(args.publicPeerFile)),
	  }
	  if (args.data) {
	    B.encryptedPrivateData = encrypt('data:', args.data);
	  }
	  sectionBundle.push(signBundle('section', B, args.privateKey, {
	    uri: args.contact
	  }));
	  
	  function encrypt(prefix, data) {
	    var key = UTILS.fromhex(hmac(args.secret, prefix + args.salt).toHex());
	    var iv = MD5(prefix + args.salt);
	    var length = data.length;
	    var state = new Array(length);
	    for (var i = 0; i < length; i++) {
	      state[i] = data.charCodeAt(i);
	    }
	    AES.cfb.encrypt(state, key, iv);
	    var out = arrayToBase64(state);
	    return out;
	  }

	  return {
	    privatePeer: {
	      $version: "1",
	      sectionBundle: sectionBundle
	    }
	  };
	}


	return {
		hmac: hmac,
		generateKeyPair: generateKeyPair,
		sign: sign,
		privateKeyToPem: PKI.privateKeyToPem,
		publicKeyToPem: PKI.publicKeyToPem,
		parsePrivatePeerFile: parsePrivatePeerFile,
		parsePublicPeerFile: parsePublicPeerFile,
		generatePrivatePeerFile: generatePrivatePeerFile,
		generatePublicPeerFile: generatePublicPeerFile,
		signBundleForKeys: signBundleForKeys
	};

});
