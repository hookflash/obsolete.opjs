
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

//	requirejs([], function() {

		// Wait for DOM to be ready.
		$(document).ready(function() {

			// Signal that everything is ready for use.
			ready.resolve();
		});
//	});

})());
