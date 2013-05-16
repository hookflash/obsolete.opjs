
const ASSERT = require("assert");
const EVENTS = require("events");
const NET = require("net");
const BIGNUM = require("bignum");
const WS = require("ws");
const COMMANDER = require("commander");
const DEFRAMER = require("./deframer");

var VERBOSE = false;

/*
 * A proxy that creates one finder connection per websocket connection
 * and proxies requests and responses by framing and deframing them.
 */
exports.main = function(options, callback) {
  try {

    options = options || {};

    VERBOSE = options.verbose || VERBOSE;

    options.hostname = options.hostname || "localhost";
    options.port = options.port || 3092;
    options.finderHostname = options.finderHostname || "127.0.0.1";
    options.finderPort = options.finderPort || 9292;

    var sockets = [];
    var connections = [];

    var server = new WS.Server({port: options.port});
    server.on("connection", function (socket) {

      var finderConnection = null;

      var finderConnectionFailed = false;
      function finderConnectionFail(err) {
        if (finderConnectionFailed) return;
        finderConnectionFailed = true;
        if (finderConnection) {
          var index = connections.indexOf(finderConnection);
          if (index > -1) connections.splice(index, 1);
          finderConnection = null;
        }
        console.error("[finder-proxy-server] Finder connection failed:", err.stack);
        if (socket) socket.end();
      }

      socket.on("close", function() {
          if (VERBOSE) console.log("[finder-proxy-server] Websocket closed");
          sockets.splice(sockets.indexOf(socket), 1);
          socket = null;
          if (finderConnection) finderConnection.close();
      });

      if (VERBOSE) console.log("[finder-proxy-server] Create finder connection");

      return newFinderConnection(options.finderHostname, options.finderPort, function(err, connection) {
        if (err) return finderConnectionFail(err);

        if (VERBOSE) console.log("[finder-proxy-server] Finder connection created");

        if (!socket) {
          if (VERBOSE) console.log("[finder-proxy-server] Immediately close finder connection as websocket closed");
          return connection.close();
        }

        finderConnection = connection;

        connections.push(finderConnection);

        finderConnection.on("error", function(err) {
          return finderConnectionFail(err);
        });

        finderConnection.on("close", function(err) {
          if (VERBOSE) console.log("[finder-proxy-server] Finder connection closed");
          if (finderConnection) {
            var index = connections.indexOf(finderConnection);
            if (index > -1) connections.splice(index, 1);
            finderConnection = null;
          }
          if (socket) socket.end();
        });

        finderConnection.on("data", function(data) {
          if (VERBOSE) console.error("[finder-proxy-server] Finder connection data:", data);
          if (socket) socket.send(data);
        });

        socket.on("message", function(message) {
          if (VERBOSE) console.error("[finder-proxy-server] Websocket message:", message);
          if (finderConnection) finderConnection.send(message);
        });

        if (socket) socket.send("ready");
      });
    });

    if (VERBOSE) console.log('[finder-proxy-server] Listening at ws://' + options.hostname + ':' + options.port + '/');

    var originalClose = server.close;
    server.close = function() {
      var intervalId = setInterval(function() {
        if (sockets.length === 0 && connections.length === 0) {
          clearInterval(intervalId);
          originalClose.call(server);
        }
      }, 100);      
    }

    setInterval(function() {
      console.log('[finder-proxy-server] Websocket connections:', sockets.length, '  Finder connections:', connections.length);
    }, 15 * 1000);

    return callback(null, {
      server: server,
      port: options.port
    });

  } catch(err) {
    return callback(err);
  }
}


function newFinderConnection(hostname, port, callback) {
  try {
    var socket = NET.connect(port, hostname, function() {
      var Client = function(socket) {
        var self = this;
        self.socket = socket;
        self.socket.once('error', function (err) {
          return self.emit("error", err);
        });
        self.socket.on('close', function () {
          return self.emit("close");
        });
        self.socket.on('data', DEFRAMER(function (chunk) {
          return self.emit("data", chunk.toString());
        }));
      }
      Client.prototype = new EVENTS.EventEmitter();
      Client.prototype.send = function(message) {
        var length;
        if (Buffer.isBuffer(message)) {
          length = message.length;
        }
        else {
          length = Buffer.byteLength(message);
        }
        var header = BIGNUM(length);

        if (VERBOSE) {
          console.log('[finder-proxy-server] Send to finder (' + this.socket._handle.fd + '):');
          console.log(header.toBuffer({
            endian : 'big',
            size: 8
          }));
          console.log(message);
        }

        this.socket.write(header.toBuffer({
          endian : 'big',
          size: 8
        }));
        this.socket.write(message);
      }
      Client.prototype.close = function() {
        this.socket.end();
      }

      var client = new Client(socket);
      return callback(null, client);
    });
    socket.once('error', function (err) {
      return callback(err);
    });
  } catch(err) {
    return callback(err);
  }
}

if (require.main === module) {

  var program = new COMMANDER.Command();

  program
    .option('--bind <ip>', 'Bind to IP')
    .option('-v, --verbose', 'Enable verbose logging')
    .parse(process.argv);

  return exports.main({
    hostname: program.bind,
    verbose: program.verbose
  }, function(err) {
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
