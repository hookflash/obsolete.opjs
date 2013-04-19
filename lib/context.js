
define([
  './util'
],function (Util) {

    "use strict";

    var Context = function(options) {
    	var self = this;

    	options = options || {};

    	// Used to generate and decrypt private peer file.
    	self.secret = options.secret || Util.randomHex(32);

		// Must be known by other peer attempting to initiate a finder connection to this peer.
		// Set to `false` if you do not want other peers to be able to find you.
		if (options.findSecret === false) {
			self.findSecret = false;
		} else {
	    	self.findSecret = options.findSecret || Util.randomHex(32);
	    }

	    // Number of seconds until the file expires.
    	self.publicPeerFileLifetime = options.publicPeerFileLifetime || (60 * 60 * 24);  // 24 hours

    	// Identifies the application using the service.
    	self.appid = options.appid || Util.randomHex(32);

    	// The openpeer namespace to connect to.
    	self.domain = options.domain || Util.getHostname();

    	// Identifies the location of this instance of the application.
    	self.locationID = options.locationID || Util.randomHex(32);

    	// A prefix used for console logging calls to identify this instance of the application.
    	self._logPrefix = options._logPrefix || Util.randomHex(32);


		function wrapConsoleArgs(args) {
			return ["(" + self._logPrefix + ")> "].concat(args);
	    }

	   	// NOTE: I know this is ugly but we cannot call `console[severity].apply()` for some reason.
	   	self._logger = {};
	    ([
	    	"log",
	    	"info",
	    	"warn",
	    	"error"
	    ]).forEach(function(severity) {
		    self._logger[severity] = function() {
		    	var args = wrapConsoleArgs(Array.prototype.slice.call(arguments));
		    	if (args.length === 1) {
		    		console[severity](args[0]);
		    	} else
		    	if (args.length === 2) {
		    		console[severity](args[0], args[1]);
		    	} else
		    	if (args.length === 3) {
		    		console[severity](args[0], args[1], args[2]);
		    	} else
		    	if (args.length === 4) {
		    		console[severity](args[0], args[1], args[2], args[3]);
		    	} else
		    	if (args.length === 5) {
		    		console[severity](args[0], args[1], args[2], args[3], args[4]);
		    	} else {
		    		throw new Error("Too many arguments");
		    	}
		    }
	    });
    }

    Context.prototype.getLogger = function() {
		return this._logger;
    }

	Context.prototype.injectLogger = function(obj) {
		var logger = this.getLogger();
		for (var name in logger) {
			if (typeof obj[name] !== "undefined") {
				throw new Error("Logger method '" + name + "' already defined on object");
			}
			obj[name] = logger[name];
		}
	}

	return Context;
});
