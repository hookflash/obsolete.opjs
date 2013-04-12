define([
  'mocks/Stack',
  'opjs/stack/Bootstrapper',
  'opjs/request',
  'opjs/util',
  'q/q'
], function (StackMock, Bootstrapper, Request, Util, Q) {

  'use strict';

  suite('Bootstrapper', function() {

    suite('Helper', function() {

      test('`/.well-known/openpeer-services-get` response', function(done) {
        new Request({
          dataType: "json",
          method: "POST",
          url: "/.well-known/openpeer-services-get",
          data: JSON.stringify({
            "request": {
              "$domain": "example.com",
              "$appid": "xyz123",
              "$id": "abc123",
              "$handler": "bootstrapper",
              "$method": "services-get"
            }
          })
        }).then(function(response) {
          assert.isObject(response);
          assert.isObject(response.body);
          assert.isObject(response.body.result);
          assert.isObject(response.body.result.services);
          return done(null);
        }).fail(done);
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
        return services.then(function(services) {
          assert.isArray(services);
          return done(null);
        }).fail(done);
      });

      test('`.getFinders()` returns promise that resolves to object', function(done) {
        var id = "peer://" + Util.getHost() + "/e433a6f9793567217787e33950211453582cadff";
        var bootstrapper = new Bootstrapper(new StackMock(), id);
        var finders = bootstrapper.getFinders();
        assert.isTrue(Q.isPromise(finders));
        return finders.then(function(finders) {
          assert.isArray(finders);
          return done(null);
        }).fail(done);
      });

    });

  });

});
