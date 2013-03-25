define(['backbone'], function(Backbone) {
  'use strict';

  var User = Backbone.Model.extend({
    nameRegex: /^[0-9a-z\.-]+$/i,
    validate: function(attrs) {
      if (!attrs || !attrs.name) {
        return new Error('No username specified');
      } else if (!this.nameRegex.test(attrs.name)) {
        return new Error('Invalid username');
      }
    }
  });

  return User;
});
