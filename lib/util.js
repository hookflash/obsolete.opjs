
if (typeof define !== 'function') { var define = require('amdefine')(module) }

define(function () {
  "use strict";

  var pool = {};
  var nativeForEach = Array.prototype.forEach;

  function randomHex(bytes) {
    if (typeof window === "undefined") {
      // We are not in browser.      
      var id = '';
      for (var i = 0; i < 5; i++) {
        var part = (Math.random() * 0x100000000).toString(16);
        id += '00000000'.substr(part.length) + part;
      }
      return id;
    }
    // We are in browser.
    var arr = pool[bytes];
    if (!arr) {
      arr = pool[bytes] = new Uint8Array(bytes);
    }
    // NOTE: Requires Firefox >= 21
    window.crypto.getRandomValues(arr);
    var hex = "";
    for (var i = 0; i < bytes; i++) {
      var v = arr[i];
      if (v < 0x10) {
        hex += "0" + v.toString(16);
      }
      else {
        hex += v.toString(16);
      }
    }
    return hex;
  }

  // forEach
  // Based on implementation in the Underscore.js library
  // http://underscorejs.org/
  function forEach(obj, iterator, context) {
    var i, l, keys, key;
    if (obj === null || obj === undefined) {
      return;
    }
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (i = 0, l = obj.length; i < l; i++) {
        iterator.call(context, obj[i], i, obj);
      }
    } else {
      keys = Object.keys(obj);
      for (i = 0, l = keys.length; i < l; i++) {
        key = keys[i];
        iterator.call(context, obj[key], key, obj);
      }
    }
  }

  // @see http://www.quirksmode.org/js/detect.html
  var BrowserDetect = null;
  ((function(window, navigator) {
    BrowserDetect = {
      init: function () {
        this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
        this.version = this.searchVersion(navigator.userAgent)
          || this.searchVersion(navigator.appVersion)
          || "an unknown version";
        this.OS = this.searchString(this.dataOS) || "an unknown OS";
      },
      searchString: function (data) {
        for (var i=0;i<data.length;i++) {
          var dataString = data[i].string;
          var dataProp = data[i].prop;
          this.versionSearchString = data[i].versionSearch || data[i].identity;
          if (dataString) {
            if (dataString.indexOf(data[i].subString) != -1)
              return data[i].identity;
          }
          else if (dataProp)
            return data[i].identity;
        }
      },
      searchVersion: function (dataString) {
        var index = dataString.indexOf(this.versionSearchString);
        if (index == -1) return;
        return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
      },
      dataBrowser: [
        {
          string: navigator.userAgent,
          subString: "Chrome",
          identity: "Chrome"
        },
        { 
          string: navigator.userAgent,
          subString: "OmniWeb",
          versionSearch: "OmniWeb/",
          identity: "OmniWeb"
        },
        {
          string: navigator.vendor,
          subString: "Apple",
          identity: "Safari",
          versionSearch: "Version"
        },
        {
          prop: window.opera,
          identity: "Opera",
          versionSearch: "Version"
        },
        {
          string: navigator.vendor,
          subString: "iCab",
          identity: "iCab"
        },
        {
          string: navigator.vendor,
          subString: "KDE",
          identity: "Konqueror"
        },
        {
          string: navigator.userAgent,
          subString: "Firefox",
          identity: "Firefox"
        },
        {
          string: navigator.vendor,
          subString: "Camino",
          identity: "Camino"
        },
        {   // for newer Netscapes (6+)
          string: navigator.userAgent,
          subString: "Netscape",
          identity: "Netscape"
        },
        {
          string: navigator.userAgent,
          subString: "MSIE",
          identity: "Explorer",
          versionSearch: "MSIE"
        },
        {
          string: navigator.userAgent,
          subString: "Gecko",
          identity: "Mozilla",
          versionSearch: "rv"
        },
        {     // for older Netscapes (4-)
          string: navigator.userAgent,
          subString: "Mozilla",
          identity: "Netscape",
          versionSearch: "Mozilla"
        }
      ],
      dataOS : [
        {
          string: navigator.platform,
          subString: "Win",
          identity: "Windows"
        },
        {
          string: navigator.platform,
          subString: "Mac",
          identity: "Mac"
        },
        {
          string: navigator.userAgent,
          subString: "iPhone",
          identity: "iPhone/iPod"
        },
        {
          string: navigator.platform,
          subString: "Linux",
          identity: "Linux"
        }
      ]

    };
    BrowserDetect.init();
  })(
    (
      (typeof window !== "undefined") ?
        window :
        // We are not in browser.
        {}
    ),
    (
      (typeof navigator !== "undefined") ?
        navigator :
        // We are not in browser.
        {
          userAgent: "nodejs",
          appVersion: "0"
        }
    )
  ));


  // @see http://docs.openpeer.org/OpenPeerProtocolSpecification#TheIdentityURIScheme
  function parseIdentityURI(uri) {
    // `identity://domain.com/alice`
    var m = uri.match(/^identity:\/\/([^\/]+)\/([^\/]+)?$/);
    if (!m) throw new Error("Could not parse identity URI '" + uri + "'");
    return {
      domain: m[1],
      identity: m[2] || null
    };
  }

  // @see http://docs.openpeer.org/OpenPeerProtocolSpecification#ThePeerURIScheme
  function parsePeerURI(uri) {
    // `peer://domain.com/abc123`
    var m = uri.match(/^peer:\/\/([^\/]+)\/([^\/]+)$/);
    if (!m) throw new Error("Could not parse peer URI '" + uri + "'");
    return {
      domain: m[1],
      contact: m[2]
    };
  }


  function arrayForPayloadObject(obj) {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    if (typeof obj !== "object") return [];
    if (Object.keys(obj).length === 0) return [];
    return [ obj ];
  }


  // TODO: Can we get a stable ID representing the physical device?
  var deviceID = randomHex(32);

  return {
    randomHex: randomHex,
    forEach: forEach,
    parseIdentityURI: parseIdentityURI,
    parsePeerURI: parsePeerURI,
    arrayForPayloadObject: arrayForPayloadObject,
    getAppURL: function() {
      return location.href;     
    },
    getHost: function() {
      // <host>:<port>
      return location.host;     
    },
    getHostname: function() {
      // <host>
      return location.hostname;
    },
    getUserAgent: function() {
      return navigator.userAgent;
    },
    getOS: function() {
      return BrowserDetect.OS;
    },
    getSystem: function() {
      return BrowserDetect.OS;
    },
    getIP: function() {
      // TODO: Fetch public IP?
      return "0.0.0.0";
    },
    getDeviceID: function() {
      return deviceID;
    }
  };

});
