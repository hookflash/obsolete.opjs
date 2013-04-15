define([
  'opjs/request',
  'opjs/util',
], function (Request, Util) {

  'use strict';

  suite('Bootstrapper-Live', function() {

    function setContect() {
      Request.setContext({
        "domain": "unstable.hookflash.me",
        "appid": Util.randomHex(32)
      });
    }

    test('`https://unstable.hookflash.me/.well-known/openpeer-services-get` response', function(done) {
      setContect();
      return Request.makeRequestTo("https://unstable.hookflash.me/.well-known/openpeer-services-get", "bootstrapper", "services-get").then(function(result) {
        assert.isObject(result);
        assert.isObject(result.services);
        return done(null);
      }).fail(done);
    });

    test('`https://unstable.hookflash.me/certificates-get` response', function(done) {
      setContect();
      return Request.makeRequestTo("https://unstable.hookflash.me/certificates-get", "certificates", "certificates-get").then(function(result) {
        assert.isObject(result);
        assert.isObject(result.certificates);
        return done(null);
      }).fail(done);
    });

    test('`https://unstable.hookflash.me/finders-get` response', function(done) {
      setContect();

      console.error("TODO: Must return actual finders!");
      return done(null);

      return Request.makeRequestTo("https://unstable.hookflash.me/finders-get", "bootstrapper-finder", "finders-get", {
        "servers": 2
      }).then(function(result) {
        assert.isObject(result);
        assert.isObject(result.finders);
        return done(null);
      }).fail(done);
    });

    test('`https://unstable.hookflash.me/signed-salt-get` response', function(done) {
      setContect();

      console.error("TODO: `Access-Control-Allow-Origin` must be set!");
      return done(null);

      return Request.makeRequestTo("https://unstable.hookflash.me/signed-salt-get", "peer-salt", "signed-salt-get", {
        "salts": 2
      }).then(function(result) {
        assert.isObject(result);
        assert.isObject(result.salts);
        return done(null);
      }).fail(done);
    });

  });

});