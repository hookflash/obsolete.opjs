define(['text!templates/login.html', 'layoutmanager', '_', 'jquery'], function(html, Backbone, _, $) {
    'use strict';

    var LoginView = Backbone.Layout.extend({
        className: 'modal login',
        events: {
            'click a[data-provider]': 'requestAuth'
        },
        template: _.template(html),
        initialize: function(options) {
            this.service = options.service || {};
            this.cookies = options.cookies || {};
            this.status = { services: true };
        },
        setStatus: function(status) {
            this.status = status;
            this.render();
        },
        redirect: function(location) {
            window.location = location;
        },
        requestAuth: function(event) {
            event.preventDefault();
            var provider = $(event.target).data('provider');
            this.service.loginService(provider.toLowerCase());
        },
        serialize: function() {
            return {
                status: this.status
            };
        }
    });

    return {
        View: LoginView
    };
});
