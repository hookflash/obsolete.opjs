/*jshint node:true*/
//'use strict';

var net = require('net');
var readline = require('readline');
var deFramer = require('./deframer');
var events = require("events");

var VERBOSE = false;


exports.connect = function(host, port, callback) {
  try {
    if (VERBOSE) console.log('Connecting to relay server at %s:%s', host, port);

    var socket = net.connect(port, host, function() {

      var Client = function(socket) {
        var self = this;
        self.socket = socket;
        self.socket.on('error', function (err) {
          return self.emit("error", err);
        });
        self.socket.on('close', function () {
          return self.emit("close");
        });
        self.socket.on('data', deFramer(function (chunk) {
          return self.emit("data", chunk);
        }));
      }
      Client.prototype = new events.EventEmitter();
      Client.prototype.send = function(message) {
        var length;
        if (Buffer.isBuffer(message)) {
          length = message.length;
        }
        else {
          length = Buffer.byteLength(message);
        }
        var header = new Buffer(4);
        header.writeUInt32BE(length, 0);
        this.socket.write(header);
        this.socket.write(message);
      }
      Client.prototype.close = function() {
        this.socket.end();
      }

      var client = new Client(socket);

      return callback(null, client);
    });
  } catch(err) {
    return callback(err);
  }
}


if (require.main === module) {

  VERBOSE = true;

  var host = process.argv[2];
  var port = parseInt(process.argv[3]);

  if (!host || !port) {
    console.error("USE: `node client-tcp <host> <port>`");
    process.exit(1);
  }

  return exports.connect(host, port, function(err, client) {

    function error(err) {
      console.error(err.stack);
      return process.exit(1);
    }

    if (err) return error(err);


    var red = '\033[31m';
    var green = '\033[32m';
    var yellow = '\033[33m';
    var blue = '\033[34m';
    var plain = '\033[39m';

    function print(msg, color) {
      if (color) {
        msg = color + msg + plain;
      }
      return process.stdout.write('\033[2K\033[E' + msg + '\n');
    }


    client.once("error", function(err) {
      return error(err);
    });

    client.once("close", function() {
      print('disconnected', green);
      return process.exit(0);
    });

    client.on("data", function(data) {
      print("< " + data, blue);
      rl.prompt();
    });


    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.on('close', function () {
      client.close();
    });

    rl.on('line', function (message) {
      client.send(message);
      rl.prompt();
    });

    rl.prompt();

    print('connected (press CTRL+C to quit)', green);
  });
}
