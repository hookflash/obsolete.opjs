define([
  'opjs-primitives/events'
], function (Events) {
  'use strict';

  function AccountMock() {  	
  }

  AccountMock.prototype = Object.create(Events.prototype);

  return AccountMock;
});
