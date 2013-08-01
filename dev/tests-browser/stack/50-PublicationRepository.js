/* global define, suite, test, assert, HELPERS */
define([
  'opjs/Stack',
  'q/q',
  'opjs/util',
], function (Stack, Q, Util) {

  'use strict';

  suite('PublicationRepository', function () {


    suite("Communicate between two connected peers", function(done) {

      this.timeout(10 * 1000);

      run("PublicationRepository-1", "PublicationRepository-2", function(API) {

        test('publish doc', function(done) {

          var pubrepo1 = API.peer1._finder._account._pubrepo;
          var pubrepo2 = API.peer2._finder._account._pubrepo;

          var pub = pubrepo1.newPublication();

          return API.peer1.publish(pub).then(function() {
            return done();
          }).fail(done);
        });

      });

    });

    function run(id1, id2, readyCallback) {

      var client1 = null;
      var client2 = null;

      test('connect', function() {

        client1 = new Stack({
          _logPrefix: "PublicationRepository - " + id1,
          identity: "identity://" + Util.getHostname() + "/test-" + id1,
          _p2pRelayHost: "localhost:3000",
          _debug: true,
          _verbose: true
        });
        client2 = new Stack({
          _logPrefix: "PublicationRepository - " + id2,
          identity: "identity://" + Util.getHostname() + "/test-" + id2,
          _p2pRelayHost: "localhost:3000",
          _debug: true,
          _verbose: true
        });
      });

      test('connected', function(done) {
        return client1.ready().then(function() {
          return client2.ready().then(function() {

            return done(null);
          });
        }).fail(done);
      });

      var API = {
        peer1: null,
        peer2: null
      };

      test('find peer', function(done) {
        client2._account.on("peer.added", function(peer) {
          API.peer2 = peer;
        });
        return client1._account._finder.findPeer("identity://" + Util.getHostname() + "/test-PublicationRepository-2").then(function(peer) {
          API.peer1 = peer;
          return done();
        }).fail(done);
      });

      test('plain message', function(done) {
        API.peer2.once("message", function(location, message) {
          assert.deepEqual(message, {
            from: "client1",
            message: "Hello World"
          });
          API.peer2.sendMessage({
            from: "client2",
            message: "Hello World"
          });
        });
        API.peer1.once("message", function(location, message) {
          assert.deepEqual(message, {
            from: "client2",
            message: "Hello World"
          });
          return done(null);
        });
        API.peer1.sendMessage({
          from: "client1",
          message: "Hello World"
        });
      });

      readyCallback(API);

      test('destroy', function(done) {
        return client1.destroy().then(function() {
          return client2.destroy().then(function() {
            return HELPERS.ensureNoConnections(done);
          });
        }).fail(done);
      });
    }

  });

});
