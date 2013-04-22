define([
  'text!templates/login.html', 'modules/peer', 'modules/oauth-prefilter',
  'layoutmanager', '_', 'q',
  'jquery'
  ], function(html, Peer, OauthPrefilter, Backbone, _, Q, $) {
  'use strict';

  var AuthEndpoints = {
    GitHub: 'https://github.com/login/oauth/authorize' +
      '?client_id=<%= client_id %>&state=<%= session_id %>',
    Twitter: '/twitter_auth'
  };

  var LoginView = Backbone.Layout.extend({
    className: 'modal login',
    events: {
      'click a[data-provider]': 'requestAuth'
    },
    template: _.template(html),
    initialize: function(options) {
      var dfd = this._dfd = Q.defer();
      var prms = dfd.promise;
      this.cookies = options.cookies;
      this.then = prms.then.bind(prms);
      this.status = { prompt: true };
      var provider;
      var value;
      // TODO: Infer provider from application state
      if (this.cookies.access_token) {
        provider = 'GitHub';
        value = this.cookies.access_token;
      } else if(this.cookies.tw_access_token){
        provider = 'Twitter';
        value = this.cookies.screen_name
      }

      if(provider){
          dfd.resolve({
              PeerCtor: Peer.models[provider],
              PeersCtor: Peer.models[provider].Peers,
              prefilter: OauthPrefilter.create(provider, value)
          });
      }
    },
    setStatus: function(status) {
      this.status = status;
      this.render();
    },
    redirect: function(location) {
      window.location = location;
    },
    requestAuth: function(event) {
      event.preventDefault();
      var provider = $(event.target).data('provider');
      var endpointTmpl = _.template(AuthEndpoints[provider]);

        console.log(Object.keys(this.cookies));
      var endpoint = endpointTmpl(this.cookies);

      this.redirect(endpoint);
    },
    serialize: function() {
      return {
        status: this.status
      };
    }
  });

  return {
    AuthEndpoints: AuthEndpoints,
    View: LoginView
  };
});
