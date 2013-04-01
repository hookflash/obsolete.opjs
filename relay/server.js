/*jshint node:true, bitwise:false*/
'use strict';

var WebSocketServer = require('ws').Server;
var net = require('net');
var EventEmitter = require('events').EventEmitter;

var wsServer = new WebSocketServer({port: 3000});
wsServer.on('connection', function (socket) {
  var realSend = socket.send;
  socket.send = function (message) {
    if (Buffer.isBuffer(message)) {
      realSend.call(socket, message, {binary: true});
    }
    else {
      realSend.call(socket, message);
    }
  };
  join(socket);
});

var tcpServer = net.createServer(function (socket) {
  var header = new Buffer(4);
  var emitter = new EventEmitter();
  socket.on('data', deFramer(function (frame) {
    emitter.emit('message', frame);
  }));
  emitter.send = function (message) {
    var length;
    if (Buffer.isBuffer(message)) {
      length = message.length;
    }
    else {
      length = Buffer.byteLength(message);
    }
    header.writeUInt32BE(length, 0);
    socket.write(header);
    socket.write(message);
  };
});
tcpServer.listen(4000);


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

var peers = {};
function join(socket) {

  socket.once('message', function (token) {

    // Make sure the token is a string
    if (Buffer.isBuffer(token)) {
      token = token.toString();
    }

    // If this is the first peer to submit the token, store the socket
    if (!(token in peers)) {
      peers[token] = socket;
      return;
    }

    // If it's the second, we have a pair, recycle the token.
    var peer = peers[token];
    delete peers[token];

    // Otherwise pipe them together
    socket.on('message', function (message) {
      peer.send(message);
    });
    peer.on('message', function (message) {
      socket.send(message);
    });
  });
}
