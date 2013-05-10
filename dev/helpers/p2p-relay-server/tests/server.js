
const PATH = require("path");
const ASSERT = require("assert");
const SERVER = require("../server");
const CLIENT_TCP = require("./client-tcp");
const CLIENT_WS = require("./client-ws");

/*

More tests if needed:

  * connect both, send token, but matching token does not get sent within 2 mins
  * one client connects to relay and disconnects (server needs to cleanely close and not leak)
  * one client connects, sends token, closes before timeout (server needs to cleanup token)
  * what if TCP client or websocket sends incorrect frames (we don't want to crash server)

*/

describe('server', function() {

	var serverInfo = null;

	it('should start ws and tcp server', function(done) {
		return SERVER.main({
			connectTimeout: 100,
		    idleTimeout: 200
		}, function(err, info) {
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
		return CLIENT_WS.connect('localhost', serverInfo.wsServerPort, function(err, client1) {
			if (err) return done(err);
			return CLIENT_WS.connect('localhost', serverInfo.wsServerPort, function(err, client2) {
				if (err) return done(err);
				return testCommSequence(client1, client2, done);
			});
		});
	});

	it('should connect one tcp and one ws client and relay messages', function(done) {
		return CLIENT_TCP.connect('localhost', serverInfo.tcpServerPort, function(err, client1) {
			if (err) return done(err);
			return CLIENT_WS.connect('localhost', serverInfo.wsServerPort, function(err, client2) {
				if (err) return done(err);
				return testCommSequence(client1, client2, done);
			});
		});
	});

	it('should close connection if ws client connects to tcp port', function(done) {
		return CLIENT_WS.connect('localhost', serverInfo.tcpServerPort, function(err, client1) {
			ASSERT.equal(err.message, "socket hang up");
			return done(null);
		});
	});

	it('should connect one client at a time', function(done) {
		return CLIENT_TCP.connect('localhost', serverInfo.tcpServerPort, function(err, client1) {
			if (err) return done(err);
			client1.on("data", function(message) {
				ASSERT.equal(message, "ready");
				return done(null);
			});
			client1.send("secret-token");
			return CLIENT_WS.connect('localhost', serverInfo.wsServerPort, function(err, client2) {
				if (err) return done(err);
				return client2.send("secret-token");
			});
		});
	});

	it('should close tcp client if no token within `connectTimeout`', function(done) {
		return CLIENT_TCP.connect('localhost', serverInfo.tcpServerPort, function(err, client1) {
			if (err) return done(err);
			var closed = false;
			client1.on("close", function() {
				closed = true;
			});
			return setTimeout(function() {
				ASSERT.equal(closed, true);
				return done(null);
				/*
				try {
					client1.send("secret-token");
				} catch(err) {
					// NOTE: The above throws with 'This socket is closed.' but for some reason
					//       we cannot catch it.
					ASSERT.equal(closed, true);
					return done(null);
				}
				*/
			}, 200);
		});
	});

	it('should close ws client if no token within `connectTimeout`', function(done) {
		return CLIENT_WS.connect('localhost', serverInfo.wsServerPort, function(err, client1) {
			if (err) return done(err);
			var closed = false;
			client1.on("close", function() {
				closed = true;
			});
			return setTimeout(function() {
				ASSERT.equal(closed, true);
				try {
					client1.send("secret-token");
				} catch(err) {
					ASSERT.equal(err.message, "not opened");
					return done(null);
				}
			}, 200);
		});
	});

	it('should close clients if no message within `idleTimeout`', function(done) {
		return CLIENT_TCP.connect('localhost', serverInfo.tcpServerPort, function(err, client1) {
			if (err) return done(err);
			return CLIENT_WS.connect('localhost', serverInfo.wsServerPort, function(err, client2) {
				if (err) return done(err);
				client1.once("data", function(message) {
					ASSERT.equal(message, "ready");
					client1.once("data", function(message) {
						ASSERT.equal(message, "message1");
						var closed = 0;
						client1.once("close", function() {
							closed += 1;
						});
						client2.once("close", function() {
							closed += 1;
						});
						setTimeout(function() {
							ASSERT.equal(closed, 2);
							return done(null);
						}, 300);
					});
					client2.send("message1");
				});
				client1.send("secret-token");
				return client2.send("secret-token");
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
