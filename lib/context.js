
define([
  './util'
],function (Util) {

    "use strict";

    var Context = function(options, extra) {
    	var self = this;

    	options = options || {};

    	self._logPrefix = options.logPrefix || Util.randomHex(32);

	    if (extra) {
	    	for (var name in extra) {
	    		self[name] = extra[name];
	    	}
	    }

	    if (typeof self.appid === "undefined") {
	    	self.appid = Util.randomHex(32);
	    }

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
