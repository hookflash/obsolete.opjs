
const PATH = require("path");
const ASSERT = require("assert");
const SERVER = require("../server");
const CLIENT_TCP = require("../client-tcp");
const CLIENT_WS = require("../client-ws");


describe('server', function() {

	var serverInfo = null;

	it('should start ws and tcp server', function(done) {
		return SERVER.main(function(err, info) {
			if (err) return done(err);
			serverInfo = info;
			return done(null);
		});
	});

	function testCommSequence(client1, client2, done) {
		try {
			client1.once("error", function(err) {
				return done(err);
			});
			client2.once("error", function(err) {
				return done(err);
			});
			var ready = 0;
			function process(evt) {
				switch(evt) {
					case "auth":
						client1.send("secret-token");
						client2.send("secret-token");
						break;
					case "client1:ready":
					case "client2:ready":
						ready += 1;
						if (ready === 2) {
							client1.send("msg1");
						}
						break;
					case "client2:msg1":
						client2.send("msg2");
						break;
					case "client1:msg2":
						client1.close();
						break;
					case "client1:close":
					case "client2:close":
						ready -= 1;
						if (ready === 0) {
							return done(null);
						}
						break;
				}
			}
		    client1.once("close", function() {
		     	process("client1:close");
		    });
		    client2.once("close", function() {
		     	process("client2:close");
		    });
		    client1.on("data", function(data) {
		    	process("client1:" + data);
		    });
		    client2.on("data", function(data) {
		    	process("client2:" + data);
		    });
		    return process("auth");
		} catch(err) {
			return done(err);
		}
	}

	it('should connect two tcp clients and relay messages', function(done) {
		return CLIENT_TCP.connect('localhost', serverInfo.tcpServerPort, function(err, client1) {
			if (err) return done(err);
			return CLIENT_TCP.connect('localhost', serverInfo.tcpServerPort, function(err, client2) {
				if (err) return done(err);
				return testCommSequence(client1, client2, done);
			});
		});
	});

	it('should connect two ws clients and relay messages', function(done) {
		return CLIENT_WS.connect('localhost', serverInfo.tcpServerPort, function(err, client1) {
			if (err) return done(err);
			return CLIENT_WS.connect('localhost', serverInfo.tcpServerPort, function(err, client2) {
				if (err) return done(err);
				return testCommSequence(client1, client2, done);
			});
		});
	});

	it('should close ws and tcp server', function(done) {
		serverInfo.wsServer._server.once('close', function() {
			return serverInfo.tcpServer.close(function() {
				return done(null);
			});
		});
		return serverInfo.wsServer.close();
	});

});


/*

TODO:

  * connect and don't send token within timeout (2 min)
  * connect, send token but matching token does not get sent within 2 mins
  * both connected, been talking but no activity for 10 mins
  * one client connects to relay and disconnects (server needs to cleanely close and not leak)
  * one client connects, sends token, closes before timeout (server needs to cleanup token)
  * what if TCP client or websocket sends incorrect frames (we don't want to crash server)
    * spew invliad packates: get tim to finish this.
*/
