/*jshint node:true, bitwise:false*/
'use strict';

module.exports = deFramer;
// A simple state machine that consumes raw bytes and emits frame events.
// Messages are framed using 32-bit big-endian unsigned integers length headers.
// Returns a parser function that consumes buffers.  It emits message buffers
// via onFrame callback passed in.
function deFramer(onFrame) {
  var buffer;
  var state = 0;
  var length = 0;
  var offset;
  return function parse(chunk) {
    for (var i = 0, l = chunk.length; i < l; i++) {
      switch (state) {
      case 0:
        length |= chunk[i] << 24;
        state = 1;
        break;
      case 1:
        length |= chunk[i] << 16;
        state = 2;
        break;
      case 2:
        length |= chunk[i] << 8;
        state = 3;
        break;
      case 3:
        length |= chunk[i];
        state = 4;
        if (length > 100 * 1024 * 1024) {
          throw new Error('Too big buffer ' + length +
                          ', chunk: ' + chunk);
        }
        buffer = new Buffer(length);
        offset = 0;
        break;
      case 4:
        var len = l - i;
        var emit = false;
        if (len + offset >= length) {
          emit = true;
          len = length - offset;
        }
        // TODO: optimize for case where a copy isn't needed can a slice can
        // be used instead?
        chunk.copy(buffer, offset, i, i + len);
        offset += len;
        i += len - 1;
        if (emit) {
          onFrame(buffer);
          state = 0;
          length = 0;
          buffer = undefined;
          offset = undefined;
        }
        break;
      }
    }
  };
}
