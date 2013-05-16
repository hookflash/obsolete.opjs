
define([
    'opjs/events',
    'opjs/assert',
    'opjs/util',
    'q/q'
], function (Events, Assert, Util, Q) {

    "use strict";

    // NOTE: Do NOT comment out `self.error` statements. These are there to catch uncaught errors.
    //		 If an error is expected as part of normal operation then add a `silenceNextError()` method.
    function WS(context, wsUri) {
        var self = this;
  		Assert.isObject(context);
	    (self._context = context).injectLogger(self);
		// Allow listeners to register before opening websocket
		setTimeout(function() {
			// NOTE: `WebSocket` is a browser global
			// @see http://www.websocket.org/
			try {
				self._wsUri = wsUri;
				if (self._context._debug) {
					self.log("[ws][" + self._wsUri + "] Opening socket ...");
				}
				self._socket = new WebSocket(wsUri);
				self._socket.onopen = function(evt) {
					try {
						if (self._context._debug) {
							self.log("[ws][" + self._wsUri + "] Socket open");
						}
						self.emit("open", evt);
					} catch(err) {
						self.error("[ws][" + self._wsUri + "] Error delivering `open` event", err.stack);
						throw err;
					}
				};
				self._socket.onclose = function(evt) {
					try {
						if (self._context._debug) {
							self.log("[ws][" + self._wsUri + "] Closed socket");
						}
						self.emit("close", evt);
					} catch(err) {
						self.error("[ws][" + self._wsUri + "] Error delivering `close` event", err.stack);
						throw err;
					}
				};
				self._socket.onmessage = function(evt) {
					try {
						if (self._context._debug) {
							self.log("[ws][" + self._wsUri + "] Received (raw):", evt.data);
						}						
						if (typeof evt.data === "string") {
							var response = null;
							self.emit("message-raw", evt.data);
							try {
								response = JSON.parse(evt.data);
							} catch(err) {}
							if (!response) return;
							self.emit("message", response);
							if (!response.result || !response.result.$id) return;
							self.emit("result:" + response.result.$id, response.result);
						}
					} catch(err) {
						self.error("[ws][" + self._wsUri + "] Error delivering `message` event", err.stack);
						throw err;
					}
				};
				self._socket.onerror = function(evt) {
					try {
						self.error("[ws][" + self._wsUri + "] Socket error:", evt);
						// TODO: Put some info from `evt` into error message below.
						self.emit("error", new Error("Socket error"));
					} catch(err) {
						self.error("[ws][" + self._wsUri + "] Error delivering `error` event", err.stack);
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
			this.error("[ws][" + this._wsUri + "] Error sending websocket message:", err.stack);
			throw err;
		}
	}

	WS.prototype.close = function() {
		try {
			this._socket.close();
		} catch(err) {
			this.error("[ws][" + this._wsUri + "] Error closing websocket:", err.stack);
			throw err;
		}
	}

	WS.prototype.makeRequestTo = function(handler, method, extra) {
		var self = this;
	  	try {
	  		var deferred = Q.defer();
	  		Assert.isString(self._context.appid);
	  		Assert.isString(handler);
	  		Assert.isString(method);
			var id = Util.randomHex(32);
	  		var payload = {
				"request": {
					"$domain": self._context.domain,
					"$appid": self._context.appid,
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
	  					self.warn("[ws][" + self._wsUri + "] Got response after timeout!");
	  					return;
	  				}
	  				clearTimeout(responseTimeout);
	  				responseTimeout = null;
					if (self._context._debug) {
						self.log("[ws][" + self._wsUri + "] Received [" + id + "]:", result);
					}
					Assert.equal(typeof result, "object");
					Assert.equal(result.$id, id);
					return deferred.resolve(result);
	  			} catch(err) {
	  				return deferred.reject(err);
	  			}
	  		});
			if (self._context._debug) {
				self.log("[ws][" + self._wsUri + "] Send (object) [" + id + "]:", payload);
			}
			payload = JSON.stringify(payload);
			if (self._context._debug) {
				self.log("[ws][" + self._wsUri + "] Send (json) [" + id + "]:", payload);
			}
	  		self.send(payload);
	  		responseTimeout = setTimeout(function() {
	  			responseTimeout = null;
	  			// TODO: Remove `self.once("result:" + id)` listener.
	  			return deferred.reject(new Error("[ws][" + self._wsUri + "] Request timed out"));
	  		}, 5 * 1000);
			return deferred.promise;
	  	} catch(err) {
	  		return Q.reject(err);
	  	}
	}

	WS.prototype.sendReplyTo = function(request, extra) {
		var self = this;
	  	try {
	  		var deferred = Q.defer();
	  		Assert.isString(request.$domain);
	  		// TODO: Comment back in once fixed https://github.com/openpeer/opjs/issues/40
	  		//Assert.isString(request.$appid);
	  		Assert.isString(request.$id);
	  		Assert.isString(request.$handler);
	  		Assert.isString(request.$method);
	  		var payload = {
				"reply": {
					"$domain": request.$domain,
					"$appid": request.$appid,
					"$id": request.$id,
					"$handler": request.$handler,
					"$method": request.$method,
					"$timestamp": Math.floor(Date.now()/1000)
				}
	  		};
	  		if (extra) {
		  		Assert(typeof extra, "object");
		  		for (var key in extra) {
		  			payload.reply[key] = extra[key];
		  		}
	  		}
			if (self._context._debug) {
				self.log("[ws][" + self._wsUri + "] Send (object) [" + request.$id + "]:", payload);
			}
			payload = JSON.stringify(payload);
			if (self._context._debug) {
				self.log("[ws][" + self._wsUri + "] Send (json) [" + request.$id + "]:", payload);
			}
	  		self.send(payload);
			return deferred.promise;
	  	} catch(err) {
	  		return Q.reject(err);
	  	}
	}

	WS.connectTo = function(context, wsUri, waitForReady) {
		var deferred = Q.defer();
		var ws = new WS(context, wsUri);
		ws.once("error", function(err) {
			if (!Q.isPending(deferred.promise)) return;
			return deferred.reject(err);
		});
		ws.on("open", function() {
			if (waitForReady) {
				return ws.once("message-raw", function(message) {
					try {
						Assert.equal(message, "ready");
						return deferred.resolve(ws);
					} catch(err) {
						return deferred.reject(err);
					}
				});
		    } else {
				return deferred.resolve(ws);
		    }
		});
		return deferred.promise;
	}

	return WS;
});
