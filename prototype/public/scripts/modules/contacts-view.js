define(['text!templates/contacts-list.html','backbone', '_', 'layoutmanager'],
  function(html, Backbone, _) {
  'use strict';

  var ContactView = Backbone.Layout.extend({
    tagName: 'li',
    className: 'contact',
    template: _.template('<%= name %>'),
    serialize: function() {
      return this.model.toJSON();
    }
  });

  var ContactsView = Backbone.Layout.extend({
    className: 'contacts',
    template: _.template(html),
    beforeRender: function() {
      this.collection.forEach(function(contact) {
        this.insertView('.contacts-list', new ContactView({ model: contact }));
      }, this);
    }
  });

  return ContactsView;
});
