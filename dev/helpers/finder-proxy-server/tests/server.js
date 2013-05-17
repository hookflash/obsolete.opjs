
const PATH = require("path");
const ASSERT = require("assert");
const SERVER = require("../server");
const CLIENT = require("./client");


describe('server', function() {

	var finderInfo = null;
	var serverInfo = null;

	it('should get finder info', function(done) {
		return CLIENT.getFinderServer(function(err, info) {
			if (err) return done(err);
			ASSERT.equal(typeof info, "object");
			ASSERT.equal(typeof info.hostname, "string");
			ASSERT.equal(typeof info.port, "number");
			ASSERT.equal(info.port > 0, true);
			finderInfo = info;
			return done(null);
		});
	});

	function sendRequest(client) {
		client.send(JSON.stringify({
			"request": {
				"$domain": finderInfo.domain,
				"$appid": "xyz123",
				"$id": "abc123",
				"$handler": "peer-finder",
				"$method": "session-create",
				"sessionProofBundle": {
					"sessionProof": {}
				}
			}
		}));
	}

	function testResponse(response) {
		response = JSON.parse(response);
		ASSERT.equal(typeof response, "object");
		ASSERT.equal(typeof response.result, "object");
		ASSERT.equal(typeof response.result.error, "object");
	}

	describe('simple sequence', function() {

		it('should start server', function(done) {
			return SERVER.main({
				finderHostname: finderInfo.hostname,
				finderPort: finderInfo.port,
				//verbose: true
			}, function(err, info) {
				if (err) return done(err);
				serverInfo = info;
				return done(null);
			});
		});

		it('should connect one client', function(done) {
			this.timeout(5 * 1000);
			return CLIENT.connect('localhost', serverInfo.port, function(err, client) {
				client.on("error", function(err) {
					return done(err);
				});
				client.on("close", function() {
					return done(null);
				});
				client.on("data", function(data) {
					if (data === "ready") {
						sendRequest(client);
					} else {
						testResponse(data);
						return client.close();
					}
				});
			});
		});

		it('should close server', function(done) {
			serverInfo.server._server.once('close', function() {
				return done(null);
			});
			return serverInfo.server.close();
		});
	});

	describe('multiple clients - sequential', function() {

		it('should start server', function(done) {
			return SERVER.main({
				finderHostname: finderInfo.hostname,
				finderPort: finderInfo.port,
				//verbose: true
			}, function(err, info) {
				if (err) return done(err);
				serverInfo = info;
				return done(null);
			});
		});

		it('should connect two clients sequentially', function(done) {
			this.timeout(5 * 1000);
			return CLIENT.connect('localhost', serverInfo.port, function(err, client1) {
				client1.on("error", function(err) {
					return done(err);
				});
				client1.on("close", function() {
					return CLIENT.connect('localhost', serverInfo.port, function(err, client2) {
						client2.on("error", function(err) {
							return done(err);
						});
						client2.on("close", function() {
							return done(null);
						});
						client2.on("data", function(data) {
							if (data === "ready") {
								sendRequest(client2);
							} else {
								testResponse(data);
								return client2.close();
							}
						});
					});
				});
				client1.on("data", function(data) {
					if (data === "ready") {
						sendRequest(client1);
					} else {
						testResponse(data);
						return client1.close();
					}
				});
			});
		});

		it('should close server', function(done) {
			serverInfo.server._server.once('close', function() {
				return done(null);
			});
			return serverInfo.server.close();
		});
	});
/*
	describe('multiple clients - parallel', function() {

		it('should start server', function(done) {
			return SERVER.main({
				finderHostname: finderInfo.hostname,
				finderPort: finderInfo.port,
				verbose: true
			}, function(err, info) {
				if (err) return done(err);
				serverInfo = info;
				return done(null);
			});
		});

		it('should connect two clients in parallel', function(done) {
			this.timeout(5 * 1000);
			return CLIENT.connect('localhost', serverInfo.port, function(err, client1) {

				var client2 = null;

				var readyCount = 0;
				function ready() {
					readyCount += 1;
					if (readyCount === 2) {
						sendRequest(client1);
						sendRequest(client2);
					}
				}
				var closeCount = 0;
				function close() {
					closeCount += 1;
					if (closeCount === 2) {
						return done(null);
					}
				}

				client1.on("error", function(err) {
					return done(err);
				});
				client1.on("close", function() {
					return close();
				});
				client1.on("data", function(data) {
					if (data === "ready") {
						ready();
					} else {
						testResponse(data);
						return client1.close();
					}
				});

				return CLIENT.connect('localhost', serverInfo.port, function(err, client) {
					client2 = client;

					client.on("error", function(err) {
						return done(err);
					});
					client.on("close", function() {
						return close();
					});
					client.on("data", function(data) {
						if (data === "ready") {
							ready();
						} else {
							testResponse(data);
							return client.close();
						}
					});
				});
			});
		});

		it('should close server', function(done) {
			serverInfo.server._server.once('close', function() {
				return done(null);
			});
			return serverInfo.server.close();
		});
	});
*/
});
