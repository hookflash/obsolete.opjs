define([
    'opjs/events',
    'opjs/assert',
    'opjs/util',
    'q/q',
    'opjs/ws',
], function (Events, Assert, Util, Q, WS) {

    function RelayClient(context, wsUri) {
        var self = this;
  		Assert.isObject(context);
	    (self._context = context).injectLogger(self);
	    self._wsUri = wsUri;
	    self._ws = null;
	}

	RelayClient.prototype = Object.create(Events.prototype);

	RelayClient.prototype.connect = function(secret) {
		var self = this;

		// Allow listeners to register before opening websocket
		setTimeout(function() {

			if (self._ws) throw new Error("Already connected");

		    self._ws = new WS(self._context, self._wsUri);

		    self._ws.on("error", function(err) {
		    	self.emit("error", err);
		    });

		    self._ws.on("open", function() {
		    	self.emit("open");
		    	self._ws.send(secret);
		    });

		    self._ws.on("message-raw", function(message) {
		    	if (message === "ready") {
		    		self.emit("connected");
		    	} else {
		    		self.emit("message", message);
		    	}
		    });

		    self._ws.on("close", function() {
		    	self.emit("close");
//		    	if (self._ws) {
		    		// TODO: Reconnect.
//		    	} else {
			    	self.emit("disconnected");
//			    }
		    });
		}, 0);
	}

	RelayClient.prototype.send = function(message) {
		if (!this._ws) throw new Error("Not connected");
		this._ws.send(message);
	}

	RelayClient.prototype.disconnect = function() {
		if (!this._ws) throw new Error("Not connected");
		this._ws.close();
		this._ws = null;
	}

    return RelayClient;
});