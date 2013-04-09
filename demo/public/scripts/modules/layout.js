define([
  'modules/conversation-view', 'modules/contacts-view',
  'modules/login', 'text!templates/layout.html', 'backbone', '_',
  'layoutmanager'
  ], function(ConversationView, ContactsView, Login, html, Backbone, _) {
  'use strict';

  var Layout = Backbone.Layout.extend({
    template: _.template(html),
    initialize: function() {
      this.conversationView = new ConversationView();
      this.insertView('.conversation-cont', this.conversationView);
    },
    setContacts: function(contacts) {
      this.contactsView = new ContactsView({ collection: contacts });
      this.setView('.contacts-cont', this.contactsView);
      this.contactsView.render();
    },
    startCall: function(peer) {
      peer.connect();
      return this.conversationView.startCall(peer);
    },
    endCall: function(reason) {
      this.conversationView.endCall(reason);
    }
  });

  return Layout;
});
