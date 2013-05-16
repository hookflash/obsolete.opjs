
define([
  './util'
],function (Util) {

    "use strict";

    var Context = function(options) {
    	var self = this;

    	options = options || {};


    	// In dev mode we talk to `localhost:*`.
    	self._dev = (Util.getHostname() === "localhost") ? true : false;
    	if (typeof options._dev !== "undefined") {
    		self._dev = options._dev;
    	}

    	// A prefix used for console logging calls to identify this instance of the application.
    	self._logPrefix = options._logPrefix || Util.randomHex(32);

    	// Debug mode and logging.
    	self._debug = options._debug || false;
    	if (self._dev && typeof options._debug === "undefined") {
    		self._debug = true;
    	}
    	self._verbose = self._debug || options._verbose || false;


    	// Used to generate and decrypt private peer file.
    	self.secret = options.secret || Util.randomHex(32);

	    // Number of seconds until the file expires.
    	self.publicPeerFileLifetime = options.publicPeerFileLifetime || (60 * 60 * 24);  // 24 hours

    	// Identifies the application using the service.
    	self.appid = options.appid || Util.randomHex(32);

    	// The primary identity of this instance of the application.
    	self.identity = options.identity || false;

    	// Override in-browser peer file generation if we have an identity.
    	// This is used to speed up tests during development.
    	// TODO: Remove once we have lockbox logic implemented.
    	self._peerFilesForIdentity = null;
    	if (self.identity && options._peerFilesForIdentity) {
    		self._peerFilesForIdentity = options._peerFilesForIdentity;
    	}

    	// The openpeer namespace to connect to.
    	self.domain = options.domain || (self.identity && Util.parseIdentityURI(self.identity).domain) || Util.getHostname();

    	// Identifies the location of this instance of the application.
    	self.locationID = options.locationID || Util.randomHex(32);

    	// The identity provider service that the bootstrapper first connects to.
    	self.identityHost = options.identityHost || (self._dev && Util.getHost()) || self.domain;

    	// Overrides for testing only.
    	self._finderHost = options._finderHost || null;
    	self._finderKeepalive = options._finderKeepalive || null;
    	self._p2pRelayHost = options._p2pRelayHost || null;


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
		    	if (severity !== "error" && !self._verbose) return;
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
