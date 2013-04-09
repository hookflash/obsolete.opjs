/*jshint node:true*/
//'use strict';

var WebSocket = require('ws');
var events = require("events");

var VERBOSE = false;


exports.connect = function(host, port, callback) {
  try {
    if (VERBOSE) console.log('Connecting to relay server at %s:%s', host, port);

    var ws = new WebSocket('ws://' + host + ':' + port + '/');
    ws.on('open', function() {

      var Client = function(ws) {
        var self = this;
        self.ws = ws;
        self.ws.on('error', function (code, description) {
          return self.emit("error", new Error(code + (description ? ' ' + description : '')));
        });
        self.ws.on('close', function () {
          return self.emit("close");
        });
        self.ws.on('message', function (data, flags) {
          return self.emit("data", data);
        });
      }
      Client.prototype = new events.EventEmitter();
      Client.prototype.send = function(message) {        
        this.ws.send(message, {mask: true});
      }
      Client.prototype.close = function() {
        this.ws.close();
      }

      var client = new Client(ws);

      return callback(null, client);
    });
  } catch(err) {
    return callback(err);
  }
}


if (require.main === module) {
  console.error("USE: `./node_modules/.bin/wscat --connect ws://<host>:<port>/`");
  process.exit(1);
}
