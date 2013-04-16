
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
	  // TODO: Don't fundge URL.
	  options.url = options.url.replace(/^https/, "http");

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
  		Assert.isString(context.domain);
  		Assert.isString(url);
  		Assert.isString(handler);
  		Assert.isString(method);
		var id = Util.randomHex(32);
  		var payload = {
			"request": {
				"$domain": context.domain,
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
		return new Request(context, {
			dataType: "json",
			method: "POST",
			url: url,
			data: JSON.stringify(payload)
		}).then(function(response) {
	      Assert.isObject(response);
	      Assert.isObject(response.body);
	      Assert.isObject(response.body.result);
	      Assert.equal(response.body.result.$id, id);
	      return response.body.result;
	    });
  	} catch(err) {
  		return Q.reject(err);
  	}
  }

  return Request;

});
