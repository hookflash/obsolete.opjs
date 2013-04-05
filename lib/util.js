define(function () {
  "use strict";

  var pool = {};
  var nativeForEach = Array.prototype.forEach;

  function randomHex(bytes) {
    var arr = pool[bytes];
    if (!arr) {
      arr = pool[bytes] = new Uint8Array(bytes);
    }
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

  return {
    randomHex: randomHex,
    forEach: forEach,
    getHost: function() {
      return location.host;     
    },
    getUserAgent: function() {
      return navigator.userAgent;
    }
  };

});
