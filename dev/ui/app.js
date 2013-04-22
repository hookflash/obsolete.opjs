
((function() {

	requirejs.config({
		paths: {
			opjs: "/lib/opjs",
			cifre: "/lib/cifre",
			q: "/lib/q",
			tests: "/tests",
			mocks: "/mocks"
		}
	});

	var ready = Q.defer();

	window.__TestHarnessReady = ready.promise;

	require([
		"q/q",
		"opjs/assert"
	], function(Q, Assert) {

		window.HELPERS = {
			callServerHelper: function(uri, data, callback) {
				$.post("/.helpers/" + uri, data || {})
				 .done(function(data) {
				 	return callback(null, data);
				 })
				 .fail(callback);
			},
			ensureNoConnections: function(callback) {
				function check(callback) {
					try {
						return window.HELPERS.callServerHelper("finder-server/connection-count", {}, function(err, count) {
							if (err) return callback(err);
							if (parseInt(count) === 0) return callback(null);
							return callback(true);
						});
					} catch(err) {
						return callback(err);
					}
				}
				var waitCount = 0;
				var waitId = setInterval(function() {
					if (waitCount > 10) {
						clearInterval(waitId);
						return callback(new Error("Connection count != 0"));
					}
					waitCount += 1;
					return check(function(err) {
						if (err === null) {
							clearInterval(waitId);
							return callback(null);
						}
					});
				}, 100);
			},
			ensureIdentity: function(identity, callback) {
				$.post("/.helpers/identity/ensure", {
					identity: identity
				}).done(function(data) {
				 	return callback(null, data);
				}).fail(callback);
			},
			peerFilesForIdentity: function(identity, callback) {
				var deferred = Q.defer();
				window.HELPERS.ensureIdentity(identity, function(err, identity) {
					if (err) return deferred.reject(err);
					return deferred.resolve({
						"contact": identity.contact,
						"publicPeerFile": identity.publicPeerFile,
						"privatePeerFile": identity.privatePeerFile,
						"privateKey": identity.privateKey,
						"publicKey": identity.publicKey
					});
				});
				return deferred.promise;
			}
		}

		// Wait for DOM to be ready.
		$(document).ready(function() {

			$("BUTTON.link-rerun").click(function() {
				location.reload(true);
			});

			// Signal that everything is ready for use.
			ready.resolve();
		});
	});

})());
