define(['text!templates/contacts-list.html',
    'text!templates/contact-list-item.html',
    'backbone', '_', 'modules/contact-view', 'layoutmanager'],
    function(contactListHtml, contactListItemHtml, Backbone, _, ContactView) {
        'use strict';

        var ContactsView = Backbone.Layout.extend({
            template: _.template(contactListHtml),
            className: 'contacts-wrapper',
            events: {
                'click .contact-holder h3': 'toggleHeader'
            },
            initialize: function() {
                this.collection.on('add', this.onRecordAdded.bind(this));
                this.collection.on('contact.selected', this.onContactSelected.bind(this));
                this.collection.on('contact.unactive', this.onContactUnSelected.bind(this));
            },
            setContacts: function(contactsArray){
                this.collection.add(contactsArray);
            },
            onRecordAdded: function(model){
                var view = new ContactView({ model: model});
                this.insertView('.contact-holder .contacts .contacts-list', view);
                view.render();
            },
            onContactUnSelected: function(view){
                this.$el.find('.contact-holder .contacts .contacts-list').append(view.$el);

                view.model.trigger('close');
                this.itemSort();

                if(!this.$el.find('.active-contacts .contacts-list li').length){
                    $('.contact-holder h3').hide();
                    $('.contact-holder h3>.icon-collapse').removeClass('collapsed');
                    $('.contact-holder h3+ul').show();
                } else {
                    this.$el.find('.active-contacts .contacts-list li').on(0).trigger('click');
                }
            },
            itemSort: function(){
                this.$el.find('.contact-holder .contacts .contacts-list li').sort(function(a, b){
                    a = $(a).find('.name').text();
                    b = $(b).find('.name').text();
                    return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
                }).appendTo('.contact-holder .contacts .contacts-list');
            },
            onContactSelected: function(view){
                if(this.$el.find('.contact-holder h3').is(':hidden')) this.$el.find('.contact-holder h3').show();
                this.$el.find('.active-contacts .contacts-list').prepend(view.$el);
            },
            toggleHeader: function(e){
                var el = ($(e.target).is('h3') ? $(e.target)[0] : $(e.target).parents('h3')[0]);
                $(el).parent().find('ul').toggle();
                $(el).find('.icon-collapse').toggleClass('collapsed');
            },
            syncContacts: function(contacts){
                this.collection.reset();
                this.render();
                this.setContacts(contacts);
            }
        });

        return ContactsView;
    });
