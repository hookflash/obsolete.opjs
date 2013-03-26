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
      this.setView('.contacts-cont', this.contactsView);
      this.insertView(this.loginView);
      this.insertView('.conversation-cont', this.conversationView);
    },
    login: function() {
      this.loginView.remove();
    },
    startCall: function(peer) {
      peer.connect();
      return this.conversationView.startCall(peer);
    }
  });

  return Layout;
});
