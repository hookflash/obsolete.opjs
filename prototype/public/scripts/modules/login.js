define([
  'text!templates/login.html', 'modules/peer', 'layoutmanager', '_', 'q',
  'jquery'
  ], function(html, Peer, Backbone, _, Q, $) {
  'use strict';

  var RequestStrategies = {
    GitHub: function(callback) {
      var match = document.cookie.match(/session_id=([^;]*)/);
      var sessionId, clientId, child;
      sessionId = match && match[1];
      match = document.cookie.match(/client_id=([^;]*)/);
      clientId = match && match[1];
      child = window.open('https://github.com/login/oauth/authorize' +
          '?client_id=' + clientId + '&state=' + sessionId,
        'github_oauth',
        'menubar=no,location=no,resizable=yes,scrollbars=yes,status=no,' +
          'width=960,height=640');
      child.addEventListener('message', function (event) {
        callback(event.data);
      }, false);
    }
  };

  var LoginView = Backbone.Layout.extend({
    className: 'modal login',
    events: {
      'click .btn[data-provider]': 'requestAuth'
    },
    template: _.template(html),
    initialize: function() {
      var dfd = this._dfd = Q.defer();
      var prms = dfd.promise;
      prms.fin(this.remove.bind(this));
      this.then = prms.then.bind(prms);
    },
    requestAuth: function(event) {
      var provider = $(event.target).data('provider');
      var requestAuth = RequestStrategies[provider];
      event.preventDefault();
      requestAuth(this.handleAuth.bind(this, provider));
    },
    handleAuth: function(provider, data) {
      var PeerModel = Peer.Model[provider] || Peer.Model;
      var user;
      if (data.error) {
        this._dfd.reject(data.error);
        return;
      }
      window.access_token = data.access_token;
      user = new PeerModel(data.user, { parse: true });
      this._dfd.resolve(user);
    },
    serialize: function() {
      return {
        login: {
          isPending: this.isPending
        }
      };
    }
  });

  return {
    RequestStrategies: RequestStrategies,
    View: LoginView
  };
});
