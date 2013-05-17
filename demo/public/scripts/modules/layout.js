define([
    'modules/conversation-view', 'modules/contacts-view',
    'modules/login', 'text!templates/layout.html', 'backbone', '_', 'modules/chat', 'text!templates/contact-list-item.html',
    'text!templates/notification-bubble.html',
    'layoutmanager'
], function(ConversationView, ContactsView, Login, html, Backbone, _, Chat, contactListItemHtml, notificationBubble) {
    'use strict';

    var Layout = Backbone.Layout.extend({
        template: _.template(html),
        events: {
            'keyup input[name="search"]': 'searchContact',
            'click .clear': 'clearInput',
            'click .sync': 'syncContacts'
        },
        initialize: function() {
            this.on('on-chat-message', this.onChatMessage, this);
            this.on('contact.online', this.contactOnLine, this);
        },
        setContacts: function(database, collection, contacts) {
            this.database = database;
            this.collection = collection;

            this.contactsView = new ContactsView({ collection: this.collection });
            this.insertView('.contacts-cont', this.contactsView);
            this.contactsView.render();
            this.contactsView.setContacts(contacts);
            this.$el.find('.search-results').on('click', this.selectSearchResult.bind(this));

            this.collection.on('start-chat-conversation', this.startChat, this);
        },
        onChatMessage: function(uid, message){
            var rec = this.getRecord(uid);

            rec.trigger('on-chat-message', uid, message);

            this.collection.trigger('contact.selected', this.contactsView.getView({model: rec}));
        },
        contactOnLine: function(uid, status){
            var rec = this.getRecord(uid);
            if(rec['cid']) {
                var el = this.contactsView.getView({model: rec}).$el.find('span.user-status');
                el.attr('class', 'user-status');
                if(status !== 'offline'){
                    el.addClass(status);

                    if(status === 'online'){
                        var bubble = $(_.template(notificationBubble, rec.attributes).toString());
                        $('.notification').append(bubble);
                        bubble.delay(1000).fadeOut(300, function(){$(this).remove()});
                    }
                }
            }
        },
        startChat: function(peer){
            this.getViews('.conversation-cont').each(function(view){
                if(view){
                    view.hide();
                    view.el.isActive = false;
                }
            });

            var chat;
            if(!this.getView({ model: peer })){
                chat = new Chat({ model: peer });
                this.insertView('.conversation-cont', chat);
                chat.render();
            } else {
                chat = this.getView({ model: peer });
                chat.show();
            }
            chat.el.isActive = true;
        },
        startCall: function(peer) {

            this.conversationView = new ConversationView();

            this.getViews('.conversation-cont').each(function(view){
                if(view){
                    view.hide();
                }
            });

            this.insertView('.conversation-cont', this.conversationView);

            this.on('call-ended', this.hangOut);

            peer.connect();
            this.onCall = true;
            return this.conversationView.startCall(peer);
        },
        endCall: function(reason) {
            this.onCall = false;
            this.conversationView.endCall(reason);
        },
        hangOut: function(){
            if(this.conversationView){
                this.conversationView.remove();
                this.getViews('.conversation-cont').each(function(view){
                    if(view && view.el.isActive){
                        view.show();
                    }
                });
            }
        },
        searchContact: function(e){
            var self = this;
            var val = $(e.target).val();
            if(val){
                this.$el.find('.clear').css('display', 'block');
                this.$el.find('.search-output').show();
                this.$el.find('.contact-holder').hide();
                this.database.search(val).done(function(result){
                    self.$el.find('.search-results').html('');
                    if(result.length) self.appendResults(result, true);
                });

            } else {
                this.clearSearchResult();
            }
        },
        appendResults: function(results){
            results.forEach(function(item){
                var li = $('<li>'+ _.template(contactListItemHtml, item) +'</li>');
                li.attr('data-record', item.uid);
                this.$el.find('.search-results').append(li);
            }.bind(this));
        },
        clearSearchResult: function(){
            this.$el.find('.clear').css('display', 'none');
            this.$el.find('.search-results').html("");
            this.$el.find('.search-output').hide();
            this.$el.find('.contact-holder').show();
            this.$el.find('input[name="search"]').val('');
        },
        selectSearchResult: function(e){
            var el = ($(e.target).is('li') ? $(e.target)[0] : $(e.target).parents('li')[0]),
                rec = this.getRecord($(el).data('record'));

            if(rec) this.contactsView.getView({model: rec}).$el.trigger('click');

            this.clearSearchResult();
        },
        getRecord: function(uid){
            var rec;
            if(this.collection.length){
                rec = this.collection.filter(function(data) {
                    return data.get('uid') === uid;
                });
                if(rec.length) rec = rec[0];
            }
            return rec;
        },
        clearInput: function(e){
            e.preventDefault();
            this.clearSearchResult();
        },
        syncContacts: function(e){
            e.preventDefault();
            if(this.onCall) return;
            if(!this.refetching) {
                var loginView = new Login.View();

                loginView.$el.appendTo('body');
                loginView.setStatus({ contacts: true });


                this.refetching = true;
                this.$('.contact-holder').addClass('loading');
                this.database.sync().then(function(){
                    window.location = window.location;
                }, function(){
                    loginView.remove();
                    this.refetching = false;
                });
            }
        }
    });

    return Layout;
});
