/* global define, suite, test, assert */
define([
  'opjs/util'
], function (util) {

  'use strict';

  suite('util', function () {

    test('Is an object', function () {
      assert.equal(typeof util, 'object');
    });

    suite('randomHex', function () {

      test('Generates random hex strings', function () {
        var hex = util.randomHex(16);
        assert.equal(hex.length, 32);
        assert(/^[0-9a-f]*$/.test(hex));
      });

    });


    suite('parseIdentity', function () {

      test('Parses `identity://domain.com/alice`', function () {
        var identityParts = util.parseIdentity('identity://domain.com/alice');
        assert.equal(identityParts.domain, 'domain.com');
        assert.equal(identityParts.identity, 'alice');
      });

    });


    suite('forEach', function () {

      test('Iterates over arrays with the supplied context', function () {
        var myArr = [0, 2, 4];
        var ctx = {};
        var count = 0;

        util.forEach(myArr, function (elem, idx, collection) {
          assert.equal(elem / 2, idx);
          assert.equal(myArr, collection);
          assert.equal(this, ctx);
          count++;
        }, ctx);

        assert.equal(count, 3);
      });

      test('Iterates over objects with the supplied context', function () {
        var myObj = {
          one: 'one!',
          two: 'two!',
          three: 'three!'
        };
        var ctx = {};
        var count = 0;

        util.forEach(myObj, function (elem, key, collection) {
          assert.equal(elem, key + '!');
          assert.equal(myObj, collection);
          assert.equal(this, ctx);
          count++;
        }, ctx);

        assert.equal(count, 3);
      });

      test('Ignores non-iterable values', function () {
        var callCount = 0;
        var error;
        var inc = function () {
          callCount++;
        };
        try {
          util.forEach(undefined, inc);
        } catch (e) {
          error = e;
        }
        assert.isUndefined(error);
        assert.equal(callCount, 0);
        try {
          util.forEach(null, inc);
        } catch (err) {
          error = err;
        }
        assert.isUndefined(error);
        assert.equal(callCount, 0);
      });

    });

  });
});