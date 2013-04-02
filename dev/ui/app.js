
((function() {

	requirejs.config({
		paths: {
			opjs: "/lib/opjs",
			cifre: "/lib/cifre",
			q: "/lib/q"
		}
	});

	var ready = Q.defer();

	window.__TestHarnessReady = ready.promise;

	requirejs(["opjs/OpenPeer", "q/q"], function(OpenPeer, Q) {

		// We want `OpenPeer` to be available globally in the browser.
		window.OpenPeer = OpenPeer;

		// Wait for DOM to be ready.
		$(document).ready(function() {

			// Signal that everything is ready for use.
			ready.resolve();
		});
	});

})());
