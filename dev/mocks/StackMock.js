define([
  'opjs/events'
], function (Events) {
  'use strict';

  function StackMock() {
  }

  StackMock.prototype = new Events();

  return StackMock;
});
