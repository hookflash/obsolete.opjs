/*jshint node: true */
'use strict';

module.exports = Client;

function Client(socket, handlers) {
  // Store the handlers hash
  this.handlers = handlers;

  // Hook up JSON serialization to websocket.
  var client = this;
  socket.on('message', function (json) {
    try {
      var message = JSON.parse(json);
      client.onMessage(message);
    } catch (err) {
      client.emit('error', err);
    }
  });
  this.send = function (message) {
    try {
      var json = JSON.stringify(message);
      socket.send(json);
    }
    catch (err) {
      client.emit('error', err);
    }
  };
}

Client.prototype.onMessage = function (message) {
  console.log(message);
  throw new Error('TODO: Implement onMessage');
};

Client.prototype.peerLocationFind = function (message) {
  console.log(message);
  throw new Error('TODO: Implement peerLocationFind');
};
