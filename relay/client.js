/*jshint node:true*/
//'use strict';

var net = require('net');
var readline = require('readline');
var deFramer = require('./deframer');

var host = process.argv[2];
var port = parseInt(process.argv[3]);

console.log('Connecting to relay server at %s:%s', host, port);

var socket = net.connect(port, host, function () {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  var red = '\033[31m';
  var green = '\033[32m';
  var yellow = '\033[33m';
  var blue = '\033[34m';
  var plain = '\033[39m';

  function print(msg, color) {
    if (color) {
      msg = color + msg + plain;
    }
    process.stdout.write('\033[2K\033[E' + msg + '\n');
  }

  print('connected (press CTRL+C to quit)', green);

  socket.on('data', deFramer(function (chunk) {
    print("< " + chunk, blue);
    rl.prompt();
  }));

  socket.on('end', function () {
    print('disconnected', green);
    process.exit();
  });

  rl.on('line', function (message) {
    var length;
    if (Buffer.isBuffer(message)) {
      length = message.length;
    }
    else {
      length = Buffer.byteLength(message);
    }
    var header = new Buffer(4);
    header.writeUInt32BE(length, 0);
    socket.write(header);
    socket.write(message);
    rl.prompt();
  });

  rl.prompt();

  rl.on('close', function () {
    socket.end();
  });
  
});
