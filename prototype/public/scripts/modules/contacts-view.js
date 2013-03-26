define(['text!templates/contacts-list.html',
  'text!templates/contact-list-item.html',
  'backbone', '_', 'layoutmanager'],
  function(contactListHtml, contactListItemHtml, Backbone, _) {
  'use strict';

  var ContactView = Backbone.Layout.extend({
    tagName: 'li',
    className: 'contact cf',
    template: _.template(contactListItemHtml),
    events: {
      'click .option-call': 'call'
    },
    call: function() {
      this.model.trigger('send-connect-request', this.model);
    },
    serialize: function() {
      return this.model.toJSON();
    }
  });

  var ContactsView = Backbone.Layout.extend({
    className: 'contacts',
    template: _.template(contactListHtml),
    beforeRender: function() {
      this.collection.forEach(function(contact) {
        this.insertView('.contacts-list', new ContactView({ model: contact }));
      }, this);
    }
  });

  return ContactsView;
});
