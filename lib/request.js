
define([
  './assert',
  './util',
  'q/q'
], function (Assert, Util, Q) {

  "use strict";

  function Request(context, options) {
    var deferred = Q.defer();	
	try {
	  // TODO: Don't use jQuery and instead ship own minimal implementation.
	  Assert(typeof $ === "function", "Global `$` from jquery not found");
      if (context._dev || options.url.indexOf("localhost") !== -1 || options.url.indexOf("webrtc.hookflash.me") !== -1) {
         options.url = options.url.replace(/^https/, "http");
      }
	  options.method = options.method || "GET";
	  $.ajax(options).done(function(data, textStatus, jqXHR) {
		return deferred.resolve({
		  statusCode: 200,
		  body: data
		});
	  }).fail(function(jqXHR, textStatus, errorThrown) {
	  	var statusCode = jqXHR.status || 0;
  		var error = new Error("Got status '" + statusCode + "' (" + errorThrown + ") while calling '" + options.url + "'");
  		error.statusCode = statusCode;
  		error.statusText = errorThrown;
		return deferred.reject(error);
	  });
	} catch(err) {
	  return deferred.reject(err);
	}
  	return deferred.promise;
  }

  Request.makeRequestTo = function(context, url, handler, method, extra) {
  	try {
  		Assert.isObject(context);
  		Assert.isString(context.appid);
  		Assert.isString(context.identityDomain);
  		Assert.isString(url);
  		Assert.isString(handler);
  		Assert.isString(method);
		var id = Util.randomHex(32);
  		var payload = {
			"request": {
				"$domain": context.identityDomain,
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
		if (context._debug) {
			context.getLogger().log("[request] Send (object):", payload);
		}
		payload = JSON.stringify(payload);
		if (context._debug) {
			context.getLogger().log("[request] Send (json):", payload);
		}
		var options = {
			dataType: "json",
			method: "POST",
			url: url,
			data: payload,
			contentType: "application/json"
		};
		// HACK: Remove once resolved: https://github.com/openpeer/opjs/issues/37
		// PROBLEM: If content-type it not standard form, client sends an OPTIONS request which server is not responding to.
		if (!context._dev && url.indexOf("localhost") === -1 && url.indexOf("webrtc.hookflash.me") === -1 && url !== ("http://" + Util.getHost() + "/.well-known/openpeer-services-get")) delete options.contentType;
		if (url.indexOf("hcs-javascript.hookflash.me") !== -1) delete options.contentType;

		return new Request(context, options).then(function(response) {
	        Assert.isObject(response);
	        Assert.isObject(response.body);
	        Assert.isObject(response.body.result);
			if (context._debug) {
				context.getLogger().log("[request] Received:", response.body.result);
			}
	        Assert.equal(response.body.result.$id, id);
	        return response.body.result;
	    });
  	} catch(err) {
  		return Q.reject(err);
  	}
  }

  // `target[0] - window`
  // `target[1] - origin`
  Request.postNotifyTo = function(context, target, handler, method, extra) {
  	try {
  		Assert.isObject(context);
  		Assert.isString(context.appid);
  		Assert.isString(context.identityDomain);
  		Assert.isObject(target);
  		Assert.isObject(target[0]);
  		Assert.isString(target[1]);
  		Assert.isString(handler);
  		Assert.isString(method);
		var id = Util.randomHex(32);
  		var payload = {
			"notify": {
				"$domain": context.identityDomain,
				"$appid": context.appid,
				"$id": id,
				"$handler": handler,
				"$method": method
			}
  		};
  		if (extra) {
	  		Assert(typeof extra, "object");
	  		for (var key in extra) {
	  			payload.notify[key] = extra[key];
	  		}
  		}
		if (context._debug) {
			context.getLogger().log("[request] Send (object):", payload);
		}
		payload = JSON.stringify(payload);
		if (context._debug) {
			context.getLogger().log("[request] Send (json):", payload);
		}
		var deferred = Q.defer();
		var timeoutId = setTimeout(function() {
			window.removeEventListener("message", listener, false);
			return deferred.reject(new Error("No post message response received in time!"));
		}, 20 * 1000);
		var listener = function(event) {
			var result = null;
			if (typeof event.data === "string" && event.data.substring(0, 1) === "{") {
				try {
					result = JSON.parse(event.data).result;
				} catch(err) {}
			}
			if (result) {
				if (context._debug) {
					context.getLogger().log("[request] Received:", result);
				}
	            if (result.$id === id) {
					clearTimeout(timeoutId);
					window.removeEventListener("message", listener, false);
					return deferred.resolve(result);
	            }
	        }
		}
		window.addEventListener("message", listener, false);
	    target[0].window.postMessage(payload, target[1]);
	    return deferred.promise;
  	} catch(err) {
  		return Q.reject(err);
  	}
  }

  return Request;

});
