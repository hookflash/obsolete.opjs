
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
		"q/q"
	], function(Q) {

		window.HELPERS = {
			callServerHelper: function(uri, data, callback) {
				$.post("/.helpers/" + uri, data || {})
				 .done(function(data) {
				 	return callback(null, data);
				 })
				 .fail(callback);
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
