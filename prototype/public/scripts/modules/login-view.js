define([
  'text!templates/login.html', 'layoutmanager', '_'
  ], function(html, Backbone, _) {
  'use strict';

  var LoginView = Backbone.Layout.extend({
    className: 'modal login',
    events: {
      submit: 'setName'
    },
    template: _.template(html),
    setName: function(event) {
      var result = this.model.set('name', this.$('.username').val(),
        { validate: true });
      if (result) {
        this.isPending = true;
      }
      this.render();
      event.preventDefault();
    },
    serialize: function() {
      return {
        user: this.model.toJSON(),
        login: {
          error: this.model.validationError,
          isPending: this.isPending
        }
      };
    },
    afterRender: function() {
      this.$('.username').focus();
    }
  });

  return LoginView;
});
