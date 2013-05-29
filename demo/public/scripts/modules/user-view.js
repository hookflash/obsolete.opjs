define(['text!templates/user.html', 'text!templates/user-line.html', 'backbone', '_', 'layoutmanager'],
    function(userHtml, userLineHtml, Backbone, _) {
        'use strict';

        var service;

        var UserSettingsLine = Backbone.Layout.extend({
            tagName: 'li',
            template: _.template(userLineHtml),
            events: {
                'click a.logout': 'logout'
            },
            initialize: function(options){

            },
            serialize: function() {
                return this.model.toJSON();
            },
            logout: function(e){
                e.preventDefault();
                var self = this;
                service.logoutService(this.model.get('provider')).then(function(){
                    if(self.$el.parents('ul.sn').find('li').length == 1){
                        window.location.reload(true);
                    } else {
                        $('.user-menu .login-form a[data-provider="'+ self.model.get('provider') +'"]').show();
                        self.trigger('logout', self.model.get('provider'));
                        self.remove();
                    }
                });
            }
        });



        var UserView = Backbone.Layout.extend({
            className: 'user-view',
            template: _.template(userHtml),
            events: {
                'click a.settings': 'openSettings',
                'click a[data-provider]': 'requestAuth'
            },
            initialize: function(options){
                this.collection = options.collection;
                service = options.service;
            },
            serialize: function() {
                return this.collection.at(0).toJSON();
            },
            afterRender: function(){
                var self = this;
                this.collection.each(function(model){
                    var line = new UserSettingsLine({ model: model});
                    self.insertView('.sn', line);
                    line.render();

                    line.on('logout', function(){
                        self.collection.remove(line.model);
                        self.render();
                    });

                    self.$el.find('.login-form a[data-provider="'+ model.get('provider') +'"]').hide();
                });

//                console.log(this.$el.find('.login-form a[data-provider]'));
                if(this.collection.length === this.$el.find('.login-form a[data-provider]').length) this.$el.find('.loginForm').hide();
            },
            requestAuth: function(event) {
                event.preventDefault();
                var provider = $(event.target).data('provider');
                service.loginService(provider);
            },
            openSettings: function(){
               this.$el.find('a.settings').toggleClass('active');
               this.$el.find('.user-menu').toggle();
            }
        });

        return UserView;



//        var model = null;

//        var UserView = Backbone.Layout.extend({
//            className: 'user-view',
//            template: _.template(userHtml),
//            events: {
//                'click a.logout': 'logout'
//            },
//            initialize: function(options){
//                this.service = options.service;
//                this.provider =  options.provider;
//                model = options.model;
//            },
//            serialize: function() {
//                return this.model.toJSON();
//            },
//            logout: function(e){
//                e.preventDefault();
//                this.service.logoutService(this.provider);
//            }
//        });
//
//        return {
//            getModel: function(){
//                return model;
//            },
//            view: function(options){
//                model = options.model;
//                return new UserView(options);
//            }
//        };
    });

