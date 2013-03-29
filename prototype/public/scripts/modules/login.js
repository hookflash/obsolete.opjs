define([
  'text!templates/login.html', 'modules/peer', 'modules/oauth-prefilter',
  'layoutmanager', '_', 'q',
  'jquery'
  ], function(html, Peer, OauthPrefilter, Backbone, _, Q, $) {
  'use strict';

  var AuthEndpoints = {
    GitHub: 'https://github.com/login/oauth/authorize' +
      '?client_id=<%= client_id %>&state=<%= session_id %>'
  };

  var LoginView = Backbone.Layout.extend({
    className: 'modal login',
    events: {
      'click .btn[data-provider]': 'requestAuth'
    },
    template: _.template(html),
    initialize: function(options) {
      var dfd = this._dfd = Q.defer();
      var prms = dfd.promise;
      this.cookies = options.cookies;
      this.then = prms.then.bind(prms);
      if (this.cookies.access_token) {
        // thing
        $.ajaxPrefilter(OauthPrefilter.create('GitHub', this.cookies.access_token));
        var user = new Peer.models.GitHub();
        var Collection = user.getCollection();
        var contacts = new Collection();
        Q.all([user.fetch(), contacts.fetch()]).then(function() {
            this.remove();
            dfd.resolve({ user: user, contacts: contacts });
          }.bind(this), function() {
            this.render();
          }.bind(this));
      }
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
    }
  });

  return {
    AuthEndpoints: AuthEndpoints,
    View: LoginView
  };
});
