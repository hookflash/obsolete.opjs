define([
  'mocks/StackMock',
  'opjs/stack/Bootstrapper',
  'opjs/util',
  'q/q'
], function (StackMock, Bootstrapper, Util, Q) {

  'use strict';

  suite('Bootstrapper', function() {

    suite('Helper', function() {

      test('`/.well-known/openpeer-services-get` response', function(done) {
        $.getJSON("/.well-known/openpeer-services-get", function(data) {
          assert.isObject(data);
          assert.isObject(data.services);
          return done(null);
        });
      });

    });

    suite('Instance', function() {

      test('`.getUrl()` for peer contact id', function() {
        var id = "peer://" + Util.getHost() + "/e433a6f9793567217787e33950211453582cadff";
        var bootstrapper = new Bootstrapper(new StackMock(), id);
        assert.equal(bootstrapper.getUrl(), "https://" + Util.getHost() + "/.well-known/openpeer-services-get");
      });

      test('`.getUrl()` for identity id', function() {
        var id = "identity://" + Util.getHost() + "/alice";
        var bootstrapper = new Bootstrapper(new StackMock(), id);
        assert.equal(bootstrapper.getUrl(), "https://" + Util.getHost() + "/.well-known/openpeer-services-get");
      });

      test('`.ready()` returns promise that resolves', function(done) {
        var id = "peer://" + Util.getHost() + "/e433a6f9793567217787e33950211453582cadff";
        var bootstrapper = new Bootstrapper(new StackMock(), id);
        var ready = bootstrapper.ready();
        assert.isTrue(Q.isPromise(ready));
        return Q.when(ready).then(function() {
          return done(null);
        }, done);
      });

      test('`.getServices()` returns promise that resolves to object', function(done) {
        var id = "peer://" + Util.getHost() + "/e433a6f9793567217787e33950211453582cadff";
        var bootstrapper = new Bootstrapper(new StackMock(), id);
        var services = bootstrapper.getServices();
        assert.isTrue(Q.isPromise(services));
        return Q.when(services).then(function(services) {
          assert.isObject(services);
          assert.isArray(services.service);
          return done(null);
        }, done);
      });

    });

  });

});
