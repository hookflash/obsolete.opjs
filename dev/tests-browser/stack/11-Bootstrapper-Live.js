/* global define, suite, test, assert */
define([
  'opjs-primitives/request',
  'opjs-primitives/util',
  'opjs-primitives/context'
], function (Request, Util, Context) {

  'use strict';

//  var HOSTNAME = DOMAIN;
//  var HOSTNAME = "provisioning-stable-dev.hookflash.me";
  var HOSTNAME = window.HFSERVICE_HOSTNAME;
  var DOMAIN = window.IDENTITY_HOSTNAME;

  suite('Bootstrapper-Live', function() {

    test('`http://' + HOSTNAME + '/services-get` response', function(done) {
      return Request.makeRequestTo(new Context({
        domain: DOMAIN,
        appid: 'com.hookflash.testapp',
        _dev: false,
        _debug: true
      }), "http://" + HOSTNAME + "/services-get", "bootstrapper", "services-get").then(function(result) {
        assert.isObject(result);
        assert.isObject(result.services);
        return done(null);
      }).fail(done);
    });

    test('`http://' + HOSTNAME + '/certificates-get` response', function(done) {
      return Request.makeRequestTo(new Context({
        domain: DOMAIN,
        appid: 'com.hookflash.testapp',
        _dev: false
      }), "http://" + HOSTNAME + "/certificates-get", "certificates", "certificates-get").then(function(result) {
        assert.isObject(result);
        assert.isObject(result.certificates);
        return done(null);
      }).fail(done);
    });

    test('`http://' + HOSTNAME + '/finders-get` response', function(done) {
      return Request.makeRequestTo(new Context({
        domain: DOMAIN,
        appid: 'com.hookflash.testapp',
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
        domain: DOMAIN,
        appid: 'com.hookflash.testapp',
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
        domain: DOMAIN,
        appid: 'com.hookflash.testapp',
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