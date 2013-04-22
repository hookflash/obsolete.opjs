define([
  'modules/conversation-view', 'modules/contacts-view',
  'modules/login', 'text!templates/layout.html', 'backbone', '_', 'modules/chat',
  'layoutmanager'
  ], function(ConversationView, ContactsView, Login, html, Backbone, _, Chat) {
  'use strict';

  var Layout = Backbone.Layout.extend({
    template: _.template(html),
    initialize: function() {

    },
    setContacts: function(contacts) {
      this.contactsView = new ContactsView({ collection: contacts });
      this.setView('.contacts', this.contactsView);
      this.contactsView.render();
    },
    startChat: function(peer){

      this.getViews('.conversation-cont').each(function(view){
        if(view) view.hide();
      });

      if(!this.getView({ model: peer })){
        var chat = new Chat({ model: peer });
        this.insertView('.conversation-cont', chat);
        chat.render();
      } else {
        this.getView({ model: peer }).show();
      }
    },
    startCall: function(peer, isVideo) {
      this.conversationView = new ConversationView();

      this.getViews('.conversation-cont').each(function(view){
        if(view){
          view.hide();
        }
      });

      this.insertView('.conversation-cont', this.conversationView);

      this.on('call-ended', this.hangOut);

      peer.connect();


      return this.conversationView.startCall(peer, isVideo);
    },
    endCall: function(reason) {
      this.conversationView.endCall(reason);
    },
    hangOut: function(){
      if(this.conversationView){
        this.conversationView.remove();
        this.getViews('.conversation-cont').each(function(view){
          if(view){
            view.show();
          }
        });
      }
    }
  });

  return Layout;
});
