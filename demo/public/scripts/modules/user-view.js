define(['text!templates/user.html', 'backbone', '_', 'layoutmanager'],
    function(userHtml, Backbone, _) {
        'use strict';

        var model = null;

        var UserView = Backbone.Layout.extend({
            className: 'user-view',
            template: _.template(userHtml),
            events: {
                'click a.logout': 'logout'
            },
            initialize: function(options){
                this.service = options.service;
                this.provider =  options.provider;
                model = options.model;
            },
            serialize: function() {
                return this.model.toJSON();
            },
            logout: function(e){
                e.preventDefault();
                this.service.logoutService(this.provider);
            }
        });

        return {
            getModel: function(){
                return model;
            },
            view: function(options){
                model = options.model;
                return new UserView(options);
            }
        };
    });

