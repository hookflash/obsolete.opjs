define(["../MessageRequest"], function (MessageRequest) {

  function SessionCreateRequest() {
    this.finderID = undefined;
    this.locationInfo = undefined;
    this.peerFiles = undefined;
  }

  SessionCreateRequest.prototype = Object.create(MessageRequest.prototype, {constructor: SessionCreateRequest});

  SessionCreateRequest.prototype.encode = function () {
    return {
      // TODO: generate JSON object
    };
  };

  return SessionCreateRequest;
});
