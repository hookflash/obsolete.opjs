/* global define, suite, test, assert */
define([
  'opjs/request',
  'opjs/util',
  'opjs/context'
], function (Request, Util, Context) {

  'use strict';

  suite('Bootstrapper-Live', function() {

    test('`https://unstable.hookflash.me/.well-known/openpeer-services-get` response', function(done) {
      return Request.makeRequestTo(new Context({}, {
        "domain": "unstable.hookflash.me",
        "appid": Util.randomHex(32)
      }), "https://unstable.hookflash.me/.well-known/openpeer-services-get", "bootstrapper", "services-get").then(function(result) {
        assert.isObject(result);
        assert.isObject(result.services);
        return done(null);
      }).fail(done);
    });

    test('`https://unstable.hookflash.me/certificates-get` response', function(done) {
      return Request.makeRequestTo(new Context({}, {
        "domain": "unstable.hookflash.me",
        "appid": Util.randomHex(32)
      }), "https://unstable.hookflash.me/certificates-get", "certificates", "certificates-get").then(function(result) {
        assert.isObject(result);
        assert.isObject(result.certificates);
        return done(null);
      }).fail(done);
    });

    test('`https://unstable.hookflash.me/finders-get` response', function(done) {
      return Request.makeRequestTo(new Context({}, {
        "domain": "unstable.hookflash.me",
        "appid": Util.randomHex(32)
      }), "https://unstable.hookflash.me/finders-get", "bootstrapper-finder", "finders-get", {
        "servers": 2
      }).then(function(result) {
        assert.isObject(result);
        assert.isObject(result.finders);
        return done(null);
      }).fail(done);
    });

    test('`https://unstable.hookflash.me/signed-salt-get` response', function(done) {
      return Request.makeRequestTo(new Context({}, {
        "domain": "unstable.hookflash.me",
        "appid": Util.randomHex(32)
      }), "https://unstable.hookflash.me/signed-salt-get", "peer-salt", "signed-salt-get", {
        "salts": 2
      }).then(function(result) {
        assert.isObject(result);
        assert.isObject(result.salts);
        return done(null);
      }).fail(done);
    });

  });

});