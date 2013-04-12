define([
  'opjs/events'
], function (Events) {
  'use strict';

  function StackMock() {
  }

  StackMock.prototype = Object.create(Events.prototype);

  return StackMock;
});
