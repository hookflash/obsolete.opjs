
const ASSERT = require("assert");
const REQUEST = require("REQUEST");
const WS = require("ws");
const EVENTS = require("events");

//var HOSTNAME = "unstable.hookflash.me";
var HOSTNAME = "provisioning-stable-dev.hookflash.me";

var VERBOSE = false;


exports.connect = function(host, port, callback) {
  try {
    if (VERBOSE) console.log('[client] Connecting to relay server at %s:%s', host, port);

    var ws = new WS('ws://' + host + ':' + port + '/');
    ws.once('error', function (err) {
      return callback(err);
    });
    ws.on('open', function() {

      var Client = function(ws) {
        var self = this;
        self.ws = ws;
        self.ws.once('error', function (code, description) {
          return self.emit("error", new Error(code + (description ? ' ' + description : '')));
        });
        self.ws.on('close', function () {
          return self.emit("close");
        });
        self.ws.on('message', function (data, flags) {
          return self.emit("data", data);
        });
      }
      Client.prototype = new EVENTS.EventEmitter();
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

exports.getFinderServer = function(callback) {

  return REQUEST({
      method: "POST",
      url: "https://" + HOSTNAME + "/finders-get",
      body: JSON.stringify({
          "$domain": "unstable.hookflash.me",
          "$appid": "xyz123",
          "$id": "abc123",
          "$handler": "bootstrapped-finders",
          "$method": "finders-get",
          "servers": 1
      })
  }, function(err, response) {
      if (err) return callback(err);
      try {
          var payload = JSON.parse(response.body);

          if (VERBOSE) console.log("[client]", response.headers);
          if (VERBOSE) console.log("[client]", JSON.stringify(payload, null, 4));

          ASSERT.equal(typeof payload, "object");
          ASSERT.equal(typeof payload.result, "object");
          ASSERT.equal(typeof payload.result.finders, "object");
          ASSERT.notEqual(typeof payload.result.finders.finderBundle, "undefined");

          var finders = payload.result.finders.finderBundle;
          if (!Array.isArray(finders)) {
            finders = [ finders ];
          }

          var tcpFinder = false;

          finders.forEach(function(finder) {
            if (finder.finder.transport === "tcp") {
              tcpFinder = {
                domain: "unstable.hookflash.me",
                hostname: finder.finder.srv.split(":")[0],
                port: parseInt(finder.finder.srv.split(":")[1])
              };
            }
          });

          return callback(null, tcpFinder);
      } catch(err) {
          return callback(err);
      }
  });
}
