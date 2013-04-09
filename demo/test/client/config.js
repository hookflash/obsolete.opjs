(function() {

  window.assert = chai.assert;

  require.config({
    // Interpret module names in terms of the application's base directory.
    // This allows us to use the application configuration data without
    // modification (see below).
    baseUrl: '../../public/scripts',
    paths: {
      test: '../../test/client',
      tests: '../../test/client/tests'
    }
  });

  // Define a fake 'app' module to prevent Require.js from loading the app's
  // true 'app' module (which is unecessary for unit testing)
  define('app', function() {});

  mocha.setup({
    ui: 'tdd',
    globals: [ 'XMLHttpRequest' ]
  });

  require([
    // Load the app's Require.js configuration file
    'require-config',
    // Load the list of test files
    'test/list_of_tests',
    ], function(_, listOfTests) {

      // Load the test files themselves
      require( listOfTests, function() {

        // Initial the tests!
        mocha.run();
      });
  });

}());
