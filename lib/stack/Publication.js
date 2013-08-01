
define([
  'opjs/events',
  'opjs/util'
], function (Events, Util) {
  'use strict';

  function Publication(context) {
    var self = this;

    (self._context = context).injectLogger(self);

    self._ready = Q.resolve();

    self._details = {
      "name": "/hookflash.com/presence/1.0/bd520f1...c0cc9b7ff528e83470e/883fa7...9533609131",
      "version": 1,
      "baseVersion": 1,
      "lineage": 5849943,
      "chunk": "1/1",
      "scope": "location",
      "contact": null,
      "location": null,
      "lifetime": "session",
      "expires": 447837433,
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

  Publication.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
  }

  return Publication;
});
