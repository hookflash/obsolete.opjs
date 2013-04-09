/*jshint node:true*/
'use strict';

var WebSocketServer = require('ws').Server;
var net = require('net');
var deFramer = require('./deframer');

var VERBOSE = false;


exports.main = function(callback) {
  try {
    var wsServerPort = 3000;
    var wsServer = new WebSocketServer({port: wsServerPort});
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

    if (VERBOSE) console.log('websocket relay listening at ws://localhost:' + wsServerPort + '/');

    var tcpServerPort = 4000;
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
    tcpServer.listen(tcpServerPort);

    if (VERBOSE) console.log('TCP relay listening at', tcpServer.address());

  } catch(err) {
    return callback(err);
  }

  return callback(null, {
    wsServer: wsServer,
    wsServerPort: wsServerPort,
    tcpServer: tcpServer,
    tcpServerPort: tcpServerPort
  });
}

var peers = {};
function join(socket) {

  var timer = setTimeout(function () {
    socket.close()
  }, 2 * 60 * 1000);

  socket.once('message', function (token) {

    // Make sure the token is a string
    if (Buffer.isBuffer(token)) {
      token = token.toString();
    }
    clearTimeout(timer);

    // If this is the first peer to submit the token, store the socket
    if (!(token in peers)) {
      peers[token] = socket;
      socket.on('end', onEarly);
      socket.on('close', onEarly);
      timer = setTimeout(onEarly, 2 * 60 * 1000);
      socket.cleanEarly = function () {
        delete peers[token];
        socket.removeListener('end', onEarly);
        socket.removeListener('close', onEarly);
        clearTimeout(timer);
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

    reset();
    function reset() {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(onTimeout, 10 * 60 * 1000);
    }
    function onTimeout() {
      if (VERBOSE) console.error('Timeout');
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
      if (VERBOSE) console.log('Closing pair');
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


if (require.main === module) {

  VERBOSE = true;

  return exports.main(function(err) {
    if (err) {
      console.error(err.stack);
      process.exit(1);
    }

    // drop to normal user after binding to the port
    if (!process.getuid()) {
      // If we're running as root, drop down to a regular user after binding to 80
      var stat = require('fs').statSync(__filename);
      console.log('Dropping to normal user', {gid: stat.gid, uid: stat.uid});
      process.setgid(stat.gid);
      process.setuid(stat.uid);
    }    
  });
}
