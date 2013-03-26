define([
  'modules/conversation-view', 'modules/contacts-view',
  'modules/login-view', 'text!templates/layout.html', 'backbone', '_',
  'layoutmanager'
  ], function(ConversationView, ContactsView, LoginView, html, Backbone, _) {
  'use strict';

  var Layout = Backbone.Layout.extend({
    template: _.template(html),
    initialize: function(options) {
      this.user = options.user;
      this.contacts = options.contacts;
      this.contactsView = new ContactsView({ collection: this.contacts });
      this.listenTo(this.contacts, 'send-connect-request', this.sendConnectReq);
      this.loginView = new LoginView({ model: this.user });
      this.conversationView = new ConversationView();
      //this.setView('.source', this.localStreamView);
      //this.setView('.remote', this.remoteStreamView);
      this.setView('.contacts-cont', this.contactsView);
      this.insertView(this.loginView);
      this.insertView('.conversation-cont', this.conversationView);
    },
    login: function() {
      this.loginView.remove();
    },
    sendCall: function(peer) {
      peer.connect();
      return this.conversationView.startCall(peer);
    },
    receiveCall: function() {

    }/*,
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
    sendConnectReq: function(peer) {

      if (peer.isActive()) {
        // TODO: Update UI accordingly
        console.error('Already connected to ' + peer.get('name') + '!');
        return;
      }
      peer.connect();
      if (this.localStreamView.isPlaying()) {
        peer.addStream(this.localStreamView.getStream());
      }

      this.trigger('send-connect-request', peer);
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
    */
  });

  return Layout;
});
