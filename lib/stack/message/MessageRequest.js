define(["./Message"], function (Message) {
  function MessageRequest() {}
  MessageRequest.prototype = Object.create(Message.prototype, {constructor: MessageRequest});
  return MessageRequest;
});
