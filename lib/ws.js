
define([
    'opjs/events'
], function (Events) {

    "use strict";

    // NOTE: Do NOT comment out `console.error` statements. These are there to catch uncaught errors.
    //		 If an error is expected as part of normal operation then add a `silenceNextError()` method.
    function WS(wsUri) {
        var self = this;
		// Allow listeners to register before opening websocket
		setTimeout(function() {
			// NOTE: `WebSocket` is a browser global
			// @see http://www.websocket.org/
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
				} catch(err) {
					console.error("Error delivering websocket `message` event", err.stack);
					throw err;
				}
			};
			self._socket.onerror = function(evt) {
				try {
					self.emit("error", evt);
				} catch(err) {
					console.error("Error delivering websocket `error` event", err.stack);
					throw err;
				}
			};
		}, 0);
	}

	WS.prototype = new Events();

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

	return WS;

});
