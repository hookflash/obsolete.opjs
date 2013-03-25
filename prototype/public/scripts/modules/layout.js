define([
  'modules/stream-views', 'modules/contacts-view', 'modules/login-view',
  'text!templates/layout.html', 'backbone', '_', 'layoutmanager'
  ], function(StreamViews, ContactsView, LoginView, html, Backbone, _) {
  'use strict';

  var Layout = Backbone.Layout.extend({
    template: _.template(html),
    events: {
      'click .btn-connect': 'connect',
      'click .btn-hang-up': 'hangUp'
    },
    initialize: function(options) {
      this.user = options.user;
      this.localStreamView = new StreamViews.LocalStreamView();
      this.remoteStreamView = new StreamViews.StreamView();
      this.contactsView = new ContactsView({ collection: options.contacts });
      this.loginView = new LoginView({ model: this.user });
      this.setView('.source', this.localStreamView);
      this.setView('.remote', this.remoteStreamView);
      this.setView('.contacts-cont', this.contactsView);
      this.insertView(this.loginView);
    },
    login: function() {
      this.loginView.remove();
    },
    playLocalStream: function(stream) {
      this.localStreamView.play(stream);
    },
    playRemoteStream: function(stream) {
      this.remoteStreamView.play(stream);
      this.render();
    },
    stopLocalStream: function() {
      this.localStreamView.stop();
    },
    stopRemoteStream: function() {
      this.remoteStreamView.stop();
      this.render();
    },
    connect: function() {
      if (this.localStreamView.isPlaying()) {
        this.trigger('connectRequest', this.localStreamView.getStream());
      } else {
        alert('Local stream not running yet - try again.');
      }
    },
    hangUp: function() {
      console.log('Hang up.');
      this.stopRemoteStream();
      this.trigger('hangup');
    },
    serialize: function() {
      return {
        isPlaying: this.remoteStreamView.isPlaying()
      };
    }
  });

  return Layout;
});
