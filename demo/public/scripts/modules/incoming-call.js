define([
    'text!templates/incoming-call.html', 'layoutmanager', '_', 'rolodex/q'
], function(html, Backbone, _, Q) {
    'use strict';

    var IncomingCallView = Backbone.Layout.extend({
        className: 'modal incoming-call',
        template: _.template(html),
        events: {
            'click .btn-accept': 'accept',
            'click .btn-reject': 'reject'
        },
        initialize: function() {
            var dfd = Q.defer();
            var promise = dfd.promise;
            this._dfd = dfd;

            promise.fin(this.remove.bind(this));

            this.then = promise.then.bind(promise);
        },
        accept: function(event) {

            this._dfd.resolve();
            event.preventDefault();
        },
        reject: function(event) {
            this._dfd.reject({ rejected: true });
            event.preventDefault();
        },
        serialize: function() {
            return {
                peer: this.model.toJSON()
            };
        }
    });

    return IncomingCallView;
});
