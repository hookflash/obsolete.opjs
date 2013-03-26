define(['modules/peer', 'backbone'], function(Peer, Backbone) {
  'use strict';

  suite('Peer', function() {

    suite('Model', function() {
      suite('#initialize', function() {
        test('Defines default connection options', function() {
          assert.ok((new Peer.Model()).connectOptions);
        });
        test('Accepts connection options as overrides', function() {
          var newOpts = {};
          var peer = new Peer.Model({ connectOptions: newOpts });
          assert.equal(peer.connectOptions, newOpts);
        });
      });
      suite('#validate', function() {
        var peer;
        suiteSetup(function() {
          peer = new Peer.Model();
        });
        test('Rejects unspecified string names', function() {
          assert.instanceOf(peer.validate(), Error);
          assert.instanceOf(peer.validate({ name: '' }), Error);
        });
        test('Rejects invalid names', function() {
          assert.instanceOf(peer.validate({ name: '!@#@#$' }), Error);
        });
      });
      suite('#getTransport', function() {
        test('Returns `undefined` when no transport is found', function() {
          var peer = new Peer.Model();
          assert.isUndefined(peer.getTransport());
        });
        test('Returns a reference to its transport object when available', function() {
          var peer = new Peer.Model();
          var transport = peer.transport = {};
          assert.equal(peer.getTransport(), transport);
        });
        test('Returns a reference to its transport object when ' +
          'part of a collection that defines a transport', function() {
          var coll = new Backbone.Collection();
          var peer = new Peer.Model();
          var transport = peer.transport = {};
          coll.transport = {};
          coll.add(peer);
          assert.equal(peer.getTransport(), transport);
        });
        test('Returns a reference to its collection\'s transport object ' +
          'when it does not define one, but is a memeber of a collection ' +
          'that does', function() {
          var coll = new Backbone.Collection();
          var peer = new Peer.Model();
          coll.transport = {};
          coll.add(peer);
          assert.equal(peer.getTransport(), coll.transport);
        });
      });
    });
  });
});
