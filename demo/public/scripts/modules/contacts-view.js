define(['text!templates/contacts-list.html',
  'text!templates/contact-list-item.html',
  'backbone', '_', 'layoutmanager'],
  function(contactListHtml, contactListItemHtml, Backbone, _) {
  'use strict';

  var ContactView = Backbone.Layout.extend({
    parent: "test",
    tagName: 'li',
    className: 'contact cf',
    template: _.template(contactListItemHtml),
    events: {
      'click': 'activetaChat'
    },
    initialize: function(){
      this.listenTo(this.model.collection, 'on-chat-message', this.onChatMessage);
      this.listenTo(this.model, 'change', this.setMessageCount);
    },
    serialize: function() {
      return this.model.toJSON();
    },
    activetaChat: function(){
      this.$el.parent().find('.active').removeClass('active');
      this.$el.addClass('active');
      this.trigger('start-chat-conversation', this.model);
    },
    onChatMessage: function(blob, id){
      var username = blob.userName.split('@')[0];

      if(username === this.model.get('name')){
        blob.message.username = this.model.get('name');
        if(!this.model.get('newMessages')){
          this.model.set({
            'newMessages': [blob.message],
            'isNewMessage': true
          });
        } else {
          this.model.get('newMessages').push(blob.message);
          this.model.set('isNewMessage', true);
          this.model.trigger('change');
        }
      }
    },
    setMessageCount: function(){
      if(this.model.get('isNewMessage')){
        this.$el.find('.new-messages').text(this.model.get('newMessages').length).show();
      } else {
        this.$el.find('.new-messages').text("").hide();
      }
//      this.$el.find('.new-messages').text()
    }
  });

  var ContactsView = Backbone.Layout.extend({
    className: 'contacts-wrapper',
    template: _.template(contactListHtml),
    initialize: function() {
      this.listenTo(this.collection, 'sync', this.render);
    },
    beforeRender: function() {
      this.collection.forEach(function(contact) {
        this.insertView('.contacts-list', new ContactView({ model: contact}));
      }, this);
    },
    some: function(){
      console.log(arguments);
    }
  });

  return ContactsView;
});
