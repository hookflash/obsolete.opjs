define(['text!templates/contacts-list.html',
    'text!templates/contact-list-item.html',
    'text!templates/notification-bubble.html',
    'backbone', '_', 'layoutmanager'],
    function(contactListHtml, contactListItemHtml, notificationBubble, Backbone, _) {
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
                this.listenTo(this.model, 'contact.status', this.setStatus);
                this.listenTo(this.model, 'destroy', function(){
                    this.remove();
                });
            },
            afterRender: function(){
                this.$el.find('>a').hide();
            },
            serialize: function() {
                return this.model.toJSON();
            },
            setStatus: function(status){
                var el = this.$el.find('span.user-status');

                el.attr('class', 'user-status');
                if(status !== 'offline'){
                    el.addClass(status);
                    if(status === 'online'){
                        var bubble = $(_.template(notificationBubble, this.model.attributes).toString());
                        $('.notification').append(bubble);
                        bubble.delay(1000).fadeOut(300, function(){$(this).remove()});
                    }
                }
            },
            activetaChat: function(e){
                e.preventDefault();
                this.$el.parents('.contact-holder').find('.active').removeClass('active');
                this.$el.addClass('active');
                this.$el.find('>a').show();
                this.trigger('start-chat-conversation', this.model);

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