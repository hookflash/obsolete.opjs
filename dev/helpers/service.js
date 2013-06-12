
const ASSERT = require("assert");


exports.responder = function(options, getPayload) {
	return function(req, res, next) {
		try {
			var request = Object.create({
				req: req
			});
			for (var name in req.body.request) {
				request[name] = req.body.request[name];
			}
//			var hostname = options.host.split(":")[0];
//			ASSERT.equal(request.$domain, hostname);
			return getPayload(request, options, function(err, response) {
				if (err) return next(err);
				if (!response) {
					res.writeHead(404);
					res.end("Not found");
					return;
				}
				var payload = {
					"result": {
					    "$domain": request.$domain,
					    "$appid": request.$appid,
					    "$id": request.$id,
					    "$handler": request.$handler,
					    "$method": request.$method,
					    "$timestamp": (Date.now() / 1000)
					}
				};
				for (var key in response) {
					payload.result[key] = response[key];
				}
				payload = JSON.stringify(payload);
				res.writeHead(200, {
					"Content-Type": "application/json",
					"Content-Length": payload.length
				});
				return res.end(payload);
			});
		} catch(err) {
			return next(err);
		}
	}
}

exports.nestResponse = function(path, obj) {
	var response;
	if (!obj) {
		response = null;
	} else
	if (Array.isArray(obj)) {
		if (obj.length === 0) {
			response = null;
		} else
		if (obj.length === 1) {
			response = obj[0];
		} else {
			response = obj;
		}
	} else {
		response = obj;
	}
	for (var i=path.length-1 ; i>=0 ; i--) {
		var node = {};
		node[path[i]] = response;
		response = node;
	}
	return response;
}
