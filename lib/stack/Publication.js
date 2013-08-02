
define([
  'opjs/events',
  'opjs/util'
], function (Events, Util) {
  'use strict';

  var version = 0;

  function Publication(context) {
    var self = this;

    (self._context = context).injectLogger(self);

    self._details = {
      "name": "/hookflash.com/presence/1.0/bd520f1...c0cc9b7ff528e83470e/883fa7...9533609131",
      "version": (++version),
      "baseVersion": version,
      "lineage": Math.floor(Date.now()/1000),
      "chunk": "1/1",
      "scope": "location",
      "contact": null,
      "location": null,
      "lifetime": "session",
      "expires": Math.floor(Date.now()/1000) + 60*60*24,  // 24 hours from now.
      "mime": "text/json",
      "encoding": "json"
    };

    self._publishToRelationships = {
      "relationships": [
        {
          "$name": "/hookflash.com/authorization-list/1.0/whitelist",
          "$allow": "all"
        }
      ]
    };

    self._data = JSON.stringify("This is test data");
  }

  Publication.prototype = Object.create(Events.prototype);

  Publication.prototype.setName = function(name) {
    this._details.name = name;
  }

  Publication.prototype.getName = function() {
    return this._details.name;
  }

  return Publication;
});
