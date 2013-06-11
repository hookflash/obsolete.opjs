define(['text!templates/invite-panel.html', 'text!templates/invite-panel-item.html', 'backbone', '_', 'layoutmanager'],
    function(panelHtml, panelItemHtml, Backbone, _) {
        'use strict';

        var InvitePanel = Backbone.Layout.extend({
            template: _.template(panelHtml),
            events: {
                'click a.invite': 'invite',
                'click a.sand': 'sendMail',
                'click a.cancel': 'cancelInvite',
                'click a.sync': 'syncContacts'
            },
            initialize: function(options){
                this.contacts = options.contacts || {};
                $('.invite-panel input[name="search"]').bind('keyup', this.searchContact.bind(this));
            },
            afterRender: function(){
                $('.invite-panel .search-results').on('click', this.selectSearchResult.bind(this));
            },
            serialize: function() {
                return {
                    contacts: this.contacts
                }
            },
            invite: function(e){
                e.preventDefault();

                this.$('.contacts .link:hidden').show();
                $(e.target).parent().hide();
                $(e.target).parents('li').append($('.email-form'));
            },
            cancelInvite: function(e){
                e.preventDefault();
                this.$('.contacts .link:hidden').show();
                $('.invite-panel').append($('.email-form'));
                $('.email-form input').val("");
            },
            sendMail: function(e){
                e.preventDefault();
                if($('input[name="email"]').val() === "") return;
                $.ajax({
                    dataType: 'json',
                    url:'/invite?contactemail='+ $('input[name="email"]').val()+ "&userename=k.alexey.s@gmail.com",
                    method: 'GET',
                    success: function(data){
                        if(data.done) {
                            $(e.target).parents('li').hide();
                            if(!$(e.target).parents('ul').find('li:not(:hidden)').length){
                                $(e.target).parents('div.contacts>div').hide();
                            }
                            $('.invite-panel').append($('.email-form'));
                            $('.email-form input').val("");
                        } else {
                            console.log(data);
                        }
                    }
                })
            },
            searchContact: function(e){
                var self = this;
                var val = $(e.target).val();
                if(val){
                    this.$el.find('.clear').css('display', 'block');
                    this.$el.find('.search-output').show();
                    this.$el.find('.contact-holder').hide();

                    var result = []

                    this.$el.find('.contact-holder li').each(function(){
                        if(!$(this).find('span.name').text().trim().toLowerCase().indexOf(val.toLowerCase())){
                            result.push($(this).clone());
                        }
                    });

                    self.$el.find('.search-results').html('');

                    if(result.length) self.$el.find('.search-results').append(result);

                } else {
                    this.clearSearchResult();
                }
            },
            clearSearchResult: function(){
                this.$el.find('.clear').css('display', 'none');
                this.$el.find('.search-results').html("");
                this.$el.find('.search-output').hide();
                this.$el.find('.contact-holder').show();
                $('.invite-panel input[name="search"]').val('');
            },
            selectSearchResult: function(e){
                var el = ($(e.target).is('li') ? $(e.target)[0] : $(e.target).parents('li')[0]);
                var rel = $(el).attr('rel');

                this.clearSearchResult();

                var sourceElement = this.$el.find('.contact-holder').find('li[rel="'+ rel +'"]');
                $('.invite-panel .contact-holder').animate({scrollTop: sourceElement.position().top}, 100);
                sourceElement.find('.invite').trigger('click');
            },
            syncContacts: function(e){
                if(this.refetchActive && e){
                    alert('contacts currently refetching');
                    return false;
                }

                if(!e){
                    this.refetchActive = false;
                    $('.sync.preloader').removeClass('preloader');
                } else {
                    e.preventDefault();
                    $(e.target).addClass('preloader');
                    this.refetchActive = true;
                    this.trigger('contacts.refetching', $(e.target).parents('div[rel]').attr('rel'));
                }
            },
            manageContacts: function(contact, action){
                if(action === 'removed'){
                    this.$('div[rel="'+ contact['service'] +'"]').find('li[rel="'+ contact['uid'] +'"]').remove();
                } else if(action === 'added'){
                    var el = $(this.$('div[rel="'+ contact['service'] +'"] li').get(0)).clone(true);

                    console.log(el);

                    el.attr('rel', contact['uid']);
                    el.find('span.avatar').css('background-image', 'url('+ contact['photo'] +')');
                    el.find('span.name').text((contact['fn'] || contact['nickname']));

                    this.$('div[rel="'+ contact['service'] +'"] ul').append(el);

                    this.$('div[rel="'+ contact['service'] +'"] li').sort(function(a, b){

                        a = $(a).find('.name').text().trim();
                        b = $(b).find('.name').text().trim();

                        return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
                    }).appendTo(this.$('div[rel="'+ contact['service'] +'"] ul'));

                }
            }
        });

        return InvitePanel;
    });


