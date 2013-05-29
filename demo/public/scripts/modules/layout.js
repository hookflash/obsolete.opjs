define([
    'modules/conversation-view', 'modules/contacts-view',
    'modules/login', 'text!templates/layout.html', 'backbone', '_', 'modules/chat', 'text!templates/contact-list-item.html',
    'modules/util', 'layoutmanager'
], function(ConversationView, ContactsView, Login, html, Backbone, _, Chat, contactListItemHtml, Util) {
    'use strict';

    var Layout = Backbone.Layout.extend({
        template: _.template(html),
        events: {
            'keyup input[name="search"]': 'searchContact',
            'click .clear': 'clearInput'
        },
        initialize: function() {
            this.on('on-chat-message', this.onChatMessage, this);
            this.on('contact.online', this.contactOnLine, this);
        },
        setContacts: function(contacts) {
            this.contactsView = new ContactsView();

            this.insertView('.contacts-cont', this.contactsView);

            this.contactsView.render();
            this.contactsView.setContacts(contacts);

            this.on('start-chat-conversation', this.startChat, this);
            this.$el.find('.search-results').on('click', this.selectSearchResult.bind(this));
        },
        onChatMessage: function(uid, message){
            var rec = this.getRecord(uid);
            rec.trigger('on-chat-message', uid, message);

//            this.collection.trigger('contact.selected', this.contactsView.getView({model: rec}));
        },
        contactOnLine: function(uid, status){
            var rec = this.getRecord(uid);
            if(rec && rec['cid']) rec.trigger('contact.status', status)
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

                var result = [];
                this.contactsView.getViews('.contacts').each(function(view){
                    var search = view.collection.filter(function(data) {
                        return !data.get('fn').toLowerCase().indexOf(val.toLowerCase());
                    });

                    if(search) result = result.concat(search);
                });

                self.$el.find('.search-results').html('');
                if(result.length) self.appendResults(result);

            } else {
                this.clearSearchResult();
            }
        },
        appendResults: function(results){
            results.forEach(function(item){
                item = item.attributes;
                var li = $('<li>'+ _.template(contactListItemHtml, item) +'</li>');
                li.attr('data-record', item.uid);
                li.find('.user-status').hide();
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

            if(rec){
                var item;
                this.contactsView.getViews('.contacts').each(function(view){
                    if(view.getView({model: rec})){
                        item = view.getView({model: rec})
                        return;
                    }
                });
                if(item) item.$el.trigger('click');
            }

            this.clearSearchResult();
        },
        getRecord: function(uid){
            var rec = null;
            var provider = uid.split(':')[0]
            this.contactsView.getViews('.contacts').each(function(view){
                if(view.provider === provider){
                    rec = view.collection.filter(function(data) {
                        return data.get('uid') === uid;
                    });
                    if(rec.length) rec = rec[0];
                }
            });
            return rec;
        },
        clearInput: function(e){
            e.preventDefault();
            this.clearSearchResult();
        },
        syncContacts: function(contacts, provider){
            var collection;

            this.contactsView.getViews('.contacts').each(function(view){
                if(view.provider === provider) collection = view.collection;
            });

            if(!contacts) {
                collection.trigger('contact.refetched');
                return;
            }
            var fnCompare = function(a, b){
                return a['uid'] === b['uid'] && a['fn'] === b['fn'] && a['nickname'] === b['nickname'] && a['photo'] === b['photo']
            };

            var diff = Util.diff(collection.records, contacts, fnCompare, 'uid');

            if(diff.inserted.length) collection.add(diff.inserted);

            if(diff.removed.length){
                diff.removed.forEach(function(item){
                    var model = collection.where({uid: item.uid})[0];
                    model.destroy();
                    collection.remove(model);
                });
            }

            collection.trigger('contact.refetched');
        },
        logoutService: function(service){
            this.contactsView.getViews('.contacts').each(function(view){
                if(view.provider === service){
                    view.collection.trigger('collection.removed');
                    view.remove();
                    if(!$('.active-contacts .contacts-list li').length){
                        $('.active-contacts h3').hide();
                        $('.active-contacts h3>.icon-collapse').removeClass('collapsed');
                        $('.active-contacts h3+ul').show();
                    } else {
                        $('.active-contacts .contacts-list li').on(0).trigger('click');
                    }
                }
            });
        }
    });

    return Layout;
});
