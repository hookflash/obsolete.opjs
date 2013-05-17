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

            this.login(provider.toLowerCase());
        },
        login: function(provider, code){

            this.service.getServices().then(function(services) {
                console.log(services[provider].authURL);

                $("body").append($("<form/>").attr({
                    "action": services[provider].authURL,
                    "method": "POST",
                    "id": "rolodex-auth-form"
                }).append($("<input/>").attr({
                        "type": "hidden",
                        "name": "successURL",
                        "value": window.location.href.replace(/\?.*$/, "")
                    })).append($("<input/>").attr({
                        "type": "hidden",
                        "name": "failURL",
                        "value":  window.location.href.replace(/\?.*$/, "") + "?fail"
                    }))).find("#rolodex-auth-form").submit();

            });
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
