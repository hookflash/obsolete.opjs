define([
    'modules/conversation-view', 'modules/contacts-view',
    'modules/login', 'text!templates/layout.html', 'backbone', '_', 'modules/chat', 'text!templates/contact-list-item.html',
    'modules/util', 'modules/invite-panel' , 'rolodex/q', 'layoutmanager'
], function(ConversationView, ContactsView, Login, html, Backbone, _, Chat, contactListItemHtml, Util, InvitePanel, Q) {
    'use strict';

    var Layout = Backbone.Layout.extend({
        template: _.template(html),
        events: {
            'keyup .contacts-cont input[name="search"]': 'searchContact',
            'click .clear': 'clearInput'
        },
        initialize: function() {
            this.on('on-chat-message', this.onChatMessage, this);
            this.on('contact.online', this.contactOnLine, this);
        },
        getContacts: function(filter, callback){
            this.options.rolodex.getContacts(null, (filter ? filter : null)).then(function(contacts){
                callback(contacts);
            });
        },
        setContacts: function(contacts) {
            this.contactsView = new ContactsView();

            this.insertView('.contacts-cont', this.contactsView);

            this.contactsView.render();
            this.contactsView.setContacts(contacts);

            this.on('start-chat-conversation', this.startChat, this);
            this.$el.find('.search-results').on('click', this.selectSearchResult.bind(this));
        },
        addInvitePanel: function(rolodex, services){
            var self = this;
            var index = 0;
            var fullListOfcontacts = {};


            function getContacts(){
                rolodex.getContacts(services.at(index).get('provider')).then(function(contacts){
                    var records = Util.sortRecords(contacts);

                    fullListOfcontacts[services.at(index).get('provider')] = records;

                    if(index < (services.length - 1)){
                        index++;
                        setTimeout(getContacts, 0);
                    } else {
                        self.invitePanel = new InvitePanel({contacts: fullListOfcontacts});
                        self.insertView('.invite-panel', self.invitePanel);
                        self.invitePanel.render();
                    }

                }).fail(function(error){
                    console.log(error);
                });
            };

            setTimeout(getContacts, 0);
        },
        onChatMessage: function(peerContact, message){
            var rec = this.getRecord(peerContact);
            rec.trigger('on-chat-message', peerContact, message);
        },
        contactOnLine: function(peerContact, status){
            var self = this;
            var rec = this.getRecord(peerContact);
            if(!rec && status === 'online') {
                this.getContacts({peerContact: peerContact}, function(contacts){
                    for(var i in contacts){
                        for(var j in contacts[i]){
                            if(contacts[i][j].peerContact === peerContact){
                                self.getContactsGroup('offline').collection.add(contacts[i][j]);
                                self.contactOnLine(peerContact, 'online');
                                break;
                            }
                        }
                    }
                });
            } else if(rec && rec['cid']){

                if(!rec.active && (status === 'online' || status === 'offline')){
                    var contactsGroup = this.getContactsGroup(status);
                    rec.collection.view.getView({ model: rec }).remove();
                    rec.collection.remove(rec);
                    contactsGroup.collection.add(rec);
                }

                rec.trigger('contact.status', (status === 'back' ? 'online' : status));
            }
        },
        getContactsGroup: function(type){
            var contactsGroup;
            this.contactsView.getViews('.contacts').each(function(view){
                if(view.group === type){
                    contactsGroup = view;
                    return;
                }
            });
            return contactsGroup
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
                this.$el.find('.contacts-cont .clear').css('display', 'block');
                this.$el.find('.contacts-cont .search-output').show();
                this.$el.find('.contacts-cont .contact-holder').hide();

                var result = [];
                this.contactsView.getViews('.contacts').each(function(view){
                    var search = view.collection.filter(function(data) {
                        return !data.get('fn').toLowerCase().indexOf(val.toLowerCase());
                    });

                    if(search) result = result.concat(search);
                });

                self.$el.find('.contacts-cont .search-results').html('');
                if(result.length) self.appendResults(result);

            } else {
                this.clearSearchResult();
            }
        },
        appendResults: function(results){
            results.forEach(function(item){
                item = item.attributes;
                var li = $('<li>'+ _.template(contactListItemHtml, item) +'</li>');
                li.attr('data-record', item.peerContact);
                li.find('.user-status').hide();
                this.$el.find('.contacts-cont .search-results').append(li);
            }.bind(this));
        },
        clearSearchResult: function(){
            this.$el.find('.contacts-cont .clear').css('display', 'none');
            this.$el.find('.contacts-cont .search-results').html("");
            this.$el.find('.contacts-cont .search-output').hide();
            this.$el.find('.contacts-cont .contact-holder').show();
            this.$el.find('.contacts-cont input[name="search"]').val('');
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
        getRecord: function(peerContact){
            var rec;
            this.contactsView.getViews('.contacts').each(function(view){

                var model = view.collection.filter(function(data) {
                    return data.get('peerContact') === peerContact;
                });

                if(model.length) rec = model[0];
            });

            return rec;
        },
        clearInput: function(e){
            e.preventDefault();
            this.clearSearchResult();
        },
        syncContacts: function(uid, info, action){
            if(!uid && !action) this.invitePanel.syncContacts();

            if(info['peerContact']){
                var model;
                this.contactsView.getViews('.contacts').each(function(view){
                    var m = view.collection.where({peerContact: info.peerContact});
                    if(m.length) model = m[0];
                });
                if(action === 'added'){
                    if(!model || !model.length) this.getContactsGroup('offline').collection.add(info);
                } else if(action === 'removed'){
                    if(model){
                        model.collection.remove(model);
                        model.destroy();
                    }
                }
            } else {
                this.invitePanel.manageContacts(info, action)
            }
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
            $('.invite-panel div[rel="'+ service +'"]').remove();
        }
    });

    return Layout;
});
