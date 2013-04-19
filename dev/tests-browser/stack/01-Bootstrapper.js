/* global define, suite, test, assert */
define([
  'mocks/Account',
  'opjs/stack/Bootstrapper',
  'opjs/request',
  'opjs/util',
  'q/q',
  'opjs/context'
], function (AccountMock, Bootstrapper, Request, Util, Q, Context) {

  'use strict';

  suite('Bootstrapper', function() {

    suite('Helper', function() {

      test('`/.well-known/openpeer-services-get` response', function(done) {
        return Request.makeRequestTo(new Context(), "http://" + Util.getHost() + "/.well-known/openpeer-services-get", "bootstrapper", "services-get").then(function(result) {
          assert.isObject(result);
          assert.isObject(result.services);
          return done(null);
        }).fail(done);
      });

    });

    suite('Instance', function() {

      test('`.getUrl()`', function() {
        var bootstrapper = new Bootstrapper(new Context(), new AccountMock(), Util.getHost());
        assert.equal(bootstrapper.getUrl(), "https://" + Util.getHost() + "/.well-known/openpeer-services-get");
      });

      test('`.ready()` returns promise that resolves', function(done) {
        var bootstrapper = new Bootstrapper(new Context(), new AccountMock(), Util.getHost());
        var ready = bootstrapper.ready();
        assert.isTrue(Q.isPromise(ready));
        return Q.when(ready).then(function() {
          return done(null);
        }, done);
      });

      test('`.getServices()` returns promise that resolves to object', function(done) {
        var bootstrapper = new Bootstrapper(new Context(), new AccountMock(), Util.getHost());
        var services = bootstrapper.getServices();
        assert.isTrue(Q.isPromise(services));
        return services.then(function(services) {
          assert.isArray(services);
          assert.isObject(services[0]);
          return done(null);
        }).fail(done);
      });

      test('`.getFinders()` returns promise that resolves to object', function(done) {
        var bootstrapper = new Bootstrapper(new Context(), new AccountMock(), Util.getHost());
        var finders = bootstrapper.getFinders();
        assert.isTrue(Q.isPromise(finders));
        return finders.then(function(finders) {
          assert.isArray(finders);
          assert.isObject(finders[0]);
          assert.isString(finders[0]["$id"]);
          return done(null);
        }).fail(done);
      });

      test('`.getCertificates()` returns promise that resolves to object', function(done) {
        var bootstrapper = new Bootstrapper(new Context(), new AccountMock(), Util.getHost());
        var certificates = bootstrapper.getCertificates();
        assert.isTrue(Q.isPromise(certificates));
        return certificates.then(function(certificates) {
          assert.isArray(certificates);
          assert.isObject(certificates[0]);
          assert.isString(certificates[0]["$id"]);
          return done(null);
        }).fail(done);
      });

      test('`.getSalts(1)` returns promise that resolves to object', function(done) {
        var bootstrapper = new Bootstrapper(new Context(), new AccountMock(), Util.getHost());
        var salts = bootstrapper.getSalts(1);
        assert.isTrue(Q.isPromise(salts));
        return salts.then(function(salts) {
          assert.isArray(salts);
          assert.isObject(salts[0]);
          assert.isString(salts[0]["$id"]);
          assert.isString(salts[0]["#text"]);
          return done(null);
        }).fail(done);
      });

    });

  });

});