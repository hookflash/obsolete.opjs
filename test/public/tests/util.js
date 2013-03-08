define(['opjs/stack/util'], function(util) {
  suite('util', function() {

    test('Is an object', function() {
      assert.equal(typeof util, 'object');
    });

    test('Generates random hex strings', function () {
      var hex = util.randomHex(16);
      assert.equal(hex.length, 32);
      assert(/^[0-9a-f]*$/.test(hex));
    });

  });
});
