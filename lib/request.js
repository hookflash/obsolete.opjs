
define([
  './assert',
  './util',
  'q/q'
], function (Assert, Util, Q) {

  "use strict";

  function Request(options) {
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

  var context = null;

  Request.setContext = function(ctx) {
  	context = ctx;
  }

  Request.makeRequestTo = function(url, handler, method, extra) {
  	try {
  		Assert(typeof context, "object");
  		Assert(typeof context.appid, "string");
  		Assert(typeof url, "string");
  		Assert(typeof handler, "string");
  		Assert(typeof method, "string");
  		var parsedUrl = url.match(/^(http|https):\/\/(([^:\/]*):(\d+))?(\/.*)?/);
  		Assert(typeof parsedUrl, "object");
		var id = Util.randomHex(32);
  		var payload = {
			"request": {
				"$domain": context.domain || parsedUrl[3],
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
		return new Request({
			dataType: "json",
			method: "POST",
			url: url,
			data: JSON.stringify(payload)
		}).then(function(response) {
	      Assert.equal(typeof response, "object");
	      Assert.equal(typeof response.body, "object");
	      Assert.equal(typeof response.body.result, "object");
	      Assert.equal(response.body.result.$id, id);
	      return response.body.result;
	    });
  	} catch(err) {
  		return Q.reject(err);
  	}
  }

  return Request;

});
