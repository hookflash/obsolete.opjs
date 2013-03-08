define(['./Message'], function (Message) {
  'use strict';

  function MessageRequest() {}

  MessageRequest.prototype = Object.create(Message.prototype, {constructor: MessageRequest});

  return MessageRequest;
});
