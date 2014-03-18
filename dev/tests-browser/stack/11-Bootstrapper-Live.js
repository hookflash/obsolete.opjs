/* global define, suite, test, assert */
define([
  'opjs/request',
  'opjs/util',
  'opjs/context'
], function (Request, Util, Context) {

  'use strict';

//  var HOSTNAME = "unstable.hookflash.me";
  var HOSTNAME = "provisioning-stable-dev.hookflash.me";

  suite('Bootstrapper-Live', function() {

    test('`http://' + HOSTNAME + '/.well-known/openpeer-services-get` response', function(done) {
      return Request.makeRequestTo(new Context({
        domain: "unstable.hookflash.me",
        appid: Util.randomHex(32),
        _dev: false,
        _debug: true
      }), "http://" + HOSTNAME + "/.well-known/openpeer-services-get", "bootstrapper", "services-get").then(function(result) {
        assert.isObject(result);
        assert.isObject(result.services);
        return done(null);
      }).fail(done);
    });

    test('`http://' + HOSTNAME + '/certificates-get` response', function(done) {
      return Request.makeRequestTo(new Context({
        domain: "unstable.hookflash.me",
        appid: Util.randomHex(32),
        _dev: false
      }), "http://" + HOSTNAME + "/certificates-get", "certificates", "certificates-get").then(function(result) {
        assert.isObject(result);
        assert.isObject(result.certificates);
        return done(null);
      }).fail(done);
    });

    test('`http://' + HOSTNAME + '/finders-get` response', function(done) {
      return Request.makeRequestTo(new Context({
        domain: "unstable.hookflash.me",
        appid: Util.randomHex(32),
        _dev: false,
        _debug: true
      }), "http://" + HOSTNAME + "/finders-get", "bootstrapped-finders", "finders-get", {
        "servers": 2
      }).then(function(result) {
        assert.isObject(result);
        assert.isObject(result.finders);
        return done(null);
      }).fail(done);
    });

    test('`http://' + HOSTNAME + '/signed-salt-get` response', function(done) {
      return Request.makeRequestTo(new Context({
        domain: "unstable.hookflash.me",
        appid: Util.randomHex(32),
        _dev: false
      }), "http://" + HOSTNAME + "/signed-salt-get", "peer-salt", "signed-salt-get", {
        "salts": 2
      }).then(function(result) {
        assert.isObject(result);
        assert.isObject(result.salts);
        return done(null);
      }).fail(done);
    });

    test('`http://' + HOSTNAME + '/identity` response', function(done) {
      return Request.makeRequestTo(new Context({
        domain: "unstable.hookflash.me",
        appid: Util.randomHex(32),
        _dev: false
      }), "http://" + HOSTNAME + "/identity", "identity-lookup", "identity-lookup", {
        "providers": {
          "provider": {
            "base": "identity://unstable.hookflash.me/",
            "separator": ",",
            "identities": "user"
          }
        }
      }).then(function(result) {
        assert.isObject(result);
        assert.isObject(result.identities);
        return done(null);
      }).fail(done);
    });

  });

});