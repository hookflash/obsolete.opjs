/*jshint node: true */
'use strict';

var Q = require('q');

module.exports = Client;

function Client(socket, handlers) {
  // Hook up JSON serialization to websocket.
  var client = this;
  this.handlers = handlers;
  this.pending = {};
  socket.on('message', function (json) {
    try {
      var message = JSON.parse(json);
      if (message.request) {
        client.onRequest(message.request);
      }
      else if (message.result) {
        client.onResult(message.result);
      }
      else if (message.reply) {
        client.onReply(message.reply);
      }
      else {
        throw new Error('Unknown message format');
      }
    } catch (err) {
      client.emit('error', err);
    }
  });


  this.sendRequest = function (method, request) {

    // Generate a unique random request ID
    // TODO: Use real secure random in real app.
    var id;
    do {
      id = (Math.random() * 0x10000000).toString(36);
    } while (id in this.pending);

    // Generate the metadata for the request
    var message = {
      $domain: 'hookflash.com',
      $id: id,
      $handler: 'peer-finder',
      $method: method
    };
    for (var key in request) {
      message[key] = request[key];
    }
    message = {request: message};

    var deferred = Q.defer();

    // Serialize the message and send it across the wire.
    var json;
    try {
      json = JSON.stringify(message);
      socket.send(json);
    }
    catch (err) {
      deferred.reject(err);
    }

    // It was send, store the pending deferred for later access
    this.pending[id] = deferred;
    // And return the promise.
    return deferred.promise;
  };
}

Client.prototype.onRequest = function (request) {
  var handler = this.handlers[request.$method];
  if (!handler) {
    throw new Error('Unknown request method: ' + request.$method);
  }
  handler(request);
};

Client.prototype.onResult = function (result) {
  var deferred = this.pending[result.$id];
  if (!deferred) {
    throw new Error('Received result with invalid $id: ' + result.$id);
  }
  delete this.pending[result.$id];
  deferred.resolve(result);
};

Client.prototype.onReply = function (reply) {
  var handler = this.handlers.reply;
  if (!handler) {
    throw new Error('Missing reply handler');
  }
  handler(reply);
};

