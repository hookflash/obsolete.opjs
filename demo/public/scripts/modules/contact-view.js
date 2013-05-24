define(['text!templates/contacts-list.html',
    'text!templates/contact-list-item.html',
    'backbone', '_', 'layoutmanager'],
    function(contactListHtml, contactListItemHtml, Backbone, _) {
        'use strict';

        var ContactView = Backbone.Layout.extend({
            tagName: 'li',
            className: 'contact cf',
            template: _.template(contactListItemHtml),
            events: {
                'click': 'activetaChat',
                'click >a':'moveFromConversation'
            },
            initialize: function(){
                this.listenTo(this.model, 'on-chat-message', this.onChatMessage);
                this.listenTo(this.model, 'change', this.setMessageCount);
            },
            afterRender: function(){
                this.$el.find('>a').hide();
            },
            serialize: function() {
                return this.model.toJSON();
            },
            activetaChat: function(e){
                this.$el.parents('.contact-holder').find('.active').removeClass('active');
                this.$el.addClass('active');

                this.$el.find('>a').show();

                this.model.collection.trigger('start-chat-conversation', this.model);

                this.model.collection.trigger('contact.selected', this);

            },
            onChatMessage: function(uid, message){
                if(uid === this.model.get('uid')){
                    message.username = this.model.get('fn');
                    message.isOwn = false;

                    if(!this.model.get('newMessages')){
                        this.model.set({
                            'newMessages': [message],
                            'isNewMessage': true
                        });
                    } else {
                        this.model.get('newMessages').push(message);
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
            },
            moveFromConversation: function(e){
                e.preventDefault();
                e.stopPropagation();
                this.$el.find('>a').hide();
                this.$el.removeClass('active');
                this.model.collection.trigger('contact.unactive', this);
            }
        });
        return ContactView;
    });