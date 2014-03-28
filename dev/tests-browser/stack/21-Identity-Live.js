/* global define, suite, test, assert, HELPERS */
define([
  'opjs/Stack',
  'q/q',
  'opjs-primitives/assert',
  'opjs-primitives/util',
  'opjs-primitives/ws',
  'opjs-primitives/context',
  'opjs-primitives/events'
], function (Stack, Q, Assert, Util, WS, Context, EventEmitter) {
  'use strict';

  var DOMAIN = window.IDENTITY_HOSTNAME;
  var outerFrameURL = 'http://jsouter-'+ INSTANCE_HOSTNAME +'/identity.html?test=true';
  var innerFrameURL = 'http://identity-'+ INSTANCE_HOSTNAME +'/login.php';

  suite('Identity', function () {

    this.timeout(10 * 1000);
/*
    suite('Identity - None', function () {

      test('connect & destroy', function(done) {
        var client = new Stack({
          _logPrefix: "Identity - None"
        });
        return client.ready().then(function() {
          return client._account._bootstrapper.ready().then(function() {
            if (!client._account._identity) {
              return client.destroy().then(function() {
                return HELPERS.ensureNoConnections(done);
              }).fail(done);
            }
          });
        }).fail(done);
      });

    });
*/

    suite('Identity - Single', function () {

      var identity = "identity://" + Util.getHostname() + "/test-identity-single";
      var client = null;

      test('connect', function (done) {
        client = new Stack({
          domain: DOMAIN,
          _dev: false,
          _logPrefix: "Identity - Single",
          appid: 'com.hookflash.testapp'
        });
        return client.ready().then(function() {
          return done(null);
        }).fail(done);
      });

      test('add identity', function (done) {
        console.log({
          outerFrameURL: outerFrameURL,
          innerFrameURL: innerFrameURL
        });
        var frames = new IdentityClient(outerFrameURL, innerFrameURL);
        // client.addIdentity(identity).then(function () {
        // }).fail(done);
      });

      test('lookup own', function (done) {
        return client._account._identity.lookup().then(function(identities) {
          Assert.isArray(identities);
          Assert(identities.length > 0);
          Assert.isObject(identities[0]);
          Assert.equal(identities[0].uri, identity);
          return done(null);
        }).fail(done);
      });

      test('destroy', function(done) {
        return client.destroy().then(function() {
          return HELPERS.ensureNoConnections(done);
        }).fail(done);
      });

    });

/*
    suite('Identity - Add One', function () {

      test('connect & destroy', function(done) {
        var client = new Stack({
          _logPrefix: "Identity - Add One"
        });
        return client.ready().then(function() {
          if (!client._account._identity) {
            return client.addIdentity("identity://" + Util.getHostname() + "/test-identity-add-one").then(function() {
              return client.destroy().then(function() {
                return HELPERS.ensureNoConnections(done);
              });
            }).fail(done);
          }
        }).fail(done);
      });

    });

    suite('Identity - Add Two', function () {

      test('connect & destroy', function(done) {
        var client = new Stack({
          _logPrefix: "Identity - Add Two"
        });
        return client.ready().then(function() {
          if (!client._account._identity) {
            return client.addIdentity("identity://" + Util.getHostname() + "/test-identity-add-two-1").then(function() {
              return client.addIdentity("identity://" + Util.getHostname() + "/test-identity-add-two-2").then(function() {
                return client.destroy().then(function() {
                  return HELPERS.ensureNoConnections(done);
                });
              });
            }).fail(done);
          }
        }).fail(done);
      });

    });
*/
  });


  // Copied from hcs-system-tests/identity_client/client.js

  function IdentityClient(outerFrame, innerFrame) {
    EventEmitter.call(this);
    var self = this;

    this._outerFrame = outerFrame;
    this._innerFrame = innerFrame;
    this._onMessage = this._onMessage.bind(this);
    window.addEventListener("message", this._onMessage, false);

    this._frame = this._loadFrame(this._outerFrame);
  }

  IdentityClient.prototype = new EventEmitter();

  IdentityClient.prototype._loadFrame = function(url) {
    var iframe = document.createElement('IFRAME');
    iframe.setAttribute("src", url);
    iframe.style.width = "300px";
    iframe.style.height = "500px";
    // iframe.style.display = "none";
    document.body.appendChild(iframe);
    return iframe;
  };

  IdentityClient.prototype._onMessage = function(event) {
    try {
      var payload = JSON.parse(event.data);

      if(payload.message == 'start-communication') {
        this._exec('initInnerFrame', [this._innerFrame]);
      } else if(payload.message == 'notify-client') {
        this.emit('message', JSON.parse(payload.json));
      }
    } catch(ex) {
      //we don't need to care
    }
  };

  IdentityClient.prototype._exec = function(method, args) {
    var payload = {
      message: "exec",
      method: method,
      args: args || []
    };
    this._frame.contentWindow.postMessage(JSON.stringify(payload), '*');
  };

  IdentityClient.prototype.send = function(bundle) {
    this._exec('sendBundleToJS', [JSON.stringify(bundle)]);
  };

  IdentityClient.prototype.register = function(name, username, password) {
    this._exec('testRegister', [name, username, password]);
  };

  IdentityClient.prototype.login = function(username, password) {
    this._exec('testLogin', [username, password]);
  };

  IdentityClient.prototype.close = function(callback) {
    var self = this;
    //force delay
    setTimeout(function() {
      document.body.removeChild(self._frame);
      window.removeEventListener("message", self._onMessage);
      if(callback) {
        callback();
      }
    }, 500);
  };

  return IdentityClient;
});
