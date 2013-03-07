define(function () {

  var pool = {};

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

  return {
    randomHex: randomHex
  };

});
