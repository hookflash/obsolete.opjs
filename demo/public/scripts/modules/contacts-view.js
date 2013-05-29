define(['text!templates/contacts-list.html',
    'text!templates/contacts-group.html',
    'text!templates/contact-list-item.html',
    'backbone', '_', 'modules/contact-view', 'layoutmanager'],
    function(contactListHtml, contactGroupHtml, contactListItemHtml, Backbone, _, ContactView) {
        'use strict';

        var ContactsGroup = Backbone.Layout.extend({
            template: _.template(contactGroupHtml),
            events: {
                'click h3': 'toggleHeader',
                'click a.sync': 'sync'
            },
            initialize: function() {
                this.collection.on('add', this.onRecordAdded.bind(this));

                this.collection.on('contact.selected', this.onContactSelected.bind(this));
                this.collection.on('contact.unactive', this.onContactUnSelected.bind(this));
                this.collection.on('contact.refetched', this.onContactRefetched.bind(this));

                this.provider = this.collection.providerUser.get('provider');
            },
            serialize: function() {
                return {
                    provider: this.provider
                };
            },
            afterRender: function(){
                if(this.collection.length){
                    this.collection.each(function(model){
                        this.onRecordAdded(model);
                    }.bind(this));
                }
            },
            toggleHeader: function(e){
                var el = ($(e.target).is('h3') ? $(e.target)[0] : $(e.target).parents('h3')[0]);
                $(el).parent().find('ul').toggle();
                $(el).find('.icon-collapse').toggleClass('collapsed');
            },
            onRecordAdded: function(model){
                var view = new ContactView({ model: model});
                this.insertView('.contacts-list', view);
                view.render();
                this.itemSort();
            },
            onContactUnSelected: function(view){

                this.$el.find('.contacts-list').append(view.$el);

                view.model.trigger('close');

                this.itemSort();

                if(!$('.active-contacts .contacts-list li').length){
                    $('.active-contacts h3').hide();
                    $('.active-contacts h3>.icon-collapse').removeClass('collapsed');
                    $('.active-contacts h3+ul').show();
                } else {
                    $('.active-contacts .contacts-list li').on(0).trigger('click');
                }
            },
            itemSort: function(){
                this.$el.find('.contacts-list li').sort(function(a, b){

                    a = $(a).find('.name').text();
                    b = $(b).find('.name').text();

                    return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
                }).appendTo(this.$el.find('.contacts-list'));
            },
            onContactSelected: function(view){
                if($('.active-contacts h3').is(':hidden')) $('.active-contacts h3').show();

                $('.active-contacts .contacts-list').prepend(view.$el);
            },
            sync: function(e){
                e.preventDefault();
                this.$el.find('a.sync span').addClass('preloader');
                this.trigger('contacts.refetching', this.provider);
            },
            onContactRefetched: function(){
                this.$el.find('a.sync span').removeClass('preloader');
            }
        });

        var ContactsView = Backbone.Layout.extend({
            template: _.template(contactListHtml),
            className: 'contacts-wrapper',
            events: {
                'click .active-contacts h3': 'toggleHeader'
            },
            initialize: function() {

            },
            setContacts: function(collection){
                for(var i in collection){
                    var contactsGroupView = new ContactsGroup({
                        collection: collection[i]
                    });

                    this.insertView('.contacts', contactsGroupView);

                    contactsGroupView.render();
                }
            },
            toggleHeader: function(e){
                var el = ($(e.target).is('h3') ? $(e.target)[0] : $(e.target).parents('h3')[0]);
                $(el).parent().find('ul').toggle();
                $(el).find('.icon-collapse').toggleClass('collapsed');
            }
        });

        return ContactsView;
    });
