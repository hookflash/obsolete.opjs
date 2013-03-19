define(['modules/finder'], function(Finder) {
  'use strict';

  suite('Finder', function() {
    test('exports a function', function() {
      assert.typeOf(Finder, 'function');
    });
  });

});
