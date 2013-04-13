
define([
    'opjs/events',
    'opjs/assert',
    'opjs/util',
    'q/q'
], function (Events, Assert, Util, Q) {

    "use strict";

    var context = null;

    // NOTE: Do NOT comment out `console.error` statements. These are there to catch uncaught errors.
    //		 If an error is expected as part of normal operation then add a `silenceNextError()` method.
    function WS(wsUri) {
        var self = this;
		// Allow listeners to register before opening websocket
		setTimeout(function() {
			// NOTE: `WebSocket` is a browser global
			// @see http://www.websocket.org/
			try {
				self._wsUri = wsUri;
		  		var parsedUri = self._wsUri.match(/^(ws):\/\/(([^:\/]*):(\d+))?(\/.*)?/);
		  		Assert(typeof parsedUri, "object");
		  		self._domain = parsedUri[3];
				self._socket = new WebSocket(wsUri);
				self._socket.onopen = function(evt) {
					try {
						self.emit("open", evt);
					} catch(err) {
						console.error("Error delivering websocket `open` event", err.stack);
						throw err;
					}
				};
				self._socket.onclose = function(evt) {
					try {
						self.emit("close", evt);
					} catch(err) {
						console.error("Error delivering websocket `close` event", err.stack);
						throw err;
					}
				};
				self._socket.onmessage = function(evt) {
					try {
						self.emit("message", evt.data);
						if (typeof evt.data === "string") {
							var response = null;
							try {
								response = JSON.parse(evt.data);
							} catch(err) {}
							if (!response || !response.result) return;
							self.emit("result:" + response.result.$id, response.result);
						}
					} catch(err) {
						console.error("Error delivering websocket `message` event", err.stack);
						throw err;
					}
				};
				self._socket.onerror = function(evt) {
					try {
						console.error("Socket error", evt);
						// TODO: Put some info from `evt` into error message below.
						self.emit("error", new Error("Socket error"));
					} catch(err) {
						console.error("Error delivering websocket `error` event", err.stack);
						throw err;
					}
				};
			} catch(err) {
				self.emit("error", err);
			}
		}, 0);
	}

	WS.prototype = Object.create(Events.prototype);

	WS.prototype.send = function(message) {
		try {
			this._socket.send(message);
		} catch(err) {
			console.error("Error sending websocket message", err.stack);
			throw err;
		}
	}

	WS.prototype.close = function() {
		try {
			this._socket.close();
		} catch(err) {
			console.error("Error closing websocket", err.stack);
			throw err;
		}
	}

	WS.prototype.makeRequestTo = function(handler, method, extra) {
		var self = this;
	  	try {
	  		var deferred = Q.defer();
	  		Assert(typeof context, "object");
	  		Assert(typeof context.appid, "string");
	  		Assert(typeof handler, "string");
	  		Assert(typeof method, "string");
			var id = Util.randomHex(32);
	  		var payload = {
				"request": {
					"$domain": self._domain,
					"$appid": context.appid,
					"$id": id,
					"$handler": handler,
					"$method": method
				}
	  		};
	  		if (extra) {
		  		Assert(typeof extra, "object");
		  		for (var key in extra) {
		  			payload.request[key] = extra[key];
		  		}
	  		}
	  		var responseTimeout = null;
	  		self.once("result:" + id, function(result) {
	  			try {
	  				// Got response after 
	  				if (!responseTimeout) {
	  					console.warn("Got response from '" + self._wsUri + "' after timeout!");
	  					return;
	  				}
	  				clearTimeout(responseTimeout);
	  				responseTimeout = null;
					Assert.equal(typeof result, "object");
					Assert.equal(result.$id, id);
					return deferred.resolve(result);
	  			} catch(err) {
	  				return deferred.reject(err);
	  			}
	  		});
	  		self.send(JSON.stringify(payload));
	  		responseTimeout = setTimeout(function() {
	  			responseTimeout = null;
	  			// TODO: Remove `self.once("result:" + id)` listener.
	  			return deferred.reject(new Error("Request to '" + self._wsUri + "' timed out"));
	  		}, 5 * 1000);
			return deferred.promise;
	  	} catch(err) {
	  		return Q.reject(err);
	  	}
	}

	WS.setContext = function(ctx) {
		context = ctx;
	}

	WS.connectTo = function(wsUri) {
		var deferred = Q.defer();
		var ws = new WS(wsUri);
		ws.once("error", function(err) {
			if (!Q.isPending(deferred.promise)) return;
			return deferred.reject(err);
		});
		ws.on("open", function() {
			return deferred.resolve(ws);
		});
		return deferred.promise;
	}

	return WS;
});
