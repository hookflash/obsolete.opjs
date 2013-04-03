/*jshint node:true*/
'use strict';

var WebSocketServer = require('ws').Server;
var net = require('net');
var deFramer = require('./deframer');

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

console.log('websocket relay listening at ws://localhost:3000/');

var tcpServer = net.createServer(function (socket) {
  var header = new Buffer(4);
  socket.on('data', deFramer(function (frame) {
    socket.emit('message', frame);
  }));
  socket.close = function () {
    socket.end();
  };
  socket.send = function (message) {
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
  join(socket);
});
tcpServer.listen(4000);

console.log('TCP relay listening at', tcpServer.address());

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
      socket.on('end', onEarly);
      socket.on('close', onEarly);
      socket.cleanEarly = function () {
        delete peers[token];
        socket.removeListener('end', onEarly);
        socket.removeListener('close', onEarly);
      };
      return;
    }

    function onEarly() {
      socket.cleanEarly();
      socket.close();
    }

    // If it's the second, we have a pair, recycle the token.
    var peer = peers[token];
    peer.cleanEarly();

    var timer;
    reset();
    function reset() {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(onTimeout, 10 * 60 * 1000);
    }
    function onTimeout() {
      console.error('Timeout');
      onEnd();
    }

    // Otherwise pipe them together
    socket.on('message', function (message) {
      reset();
      peer.send(message);
    });
    peer.on('message', function (message) {
      reset();
      socket.send(message);
    });

    peer.on('end', onEnd);
    socket.on('end', onEnd);
    peer.on('close', onEnd);
    socket.on('close', onEnd);
    peer.on('error', onError);
    socket.on('error', onError);

    var alive = true;
    function onEnd() {
      if (!alive) { return; }
      clearTimeout(timer);
      alive = false;
      console.log('Closing pair');
      peer.close();
      socket.close();
    }

    function onError(err) {
      console.error(err.stack);
      onEnd();
    }
    peer.send('ready');
    socket.send('ready');
  });
}
