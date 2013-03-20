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

    var deferred = Q.defer();

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

    var json;
    try {
      json = JSON.stringify({request: message});
      socket.send(json);
    }
    catch (err) {
      deferred.reject(err);
    }

    this.pending[id] = deferred;
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
  deferred.notify(result);
};

Client.prototype.onReply = function (reply) {
  var deferred = this.pending[reply.$id];
  if (!deferred) {
    throw new Error('Received reply with invalid $id: ' + reply.$id);
  }
  delete this.pending[reply.$id];
  deferred.resolve(reply);
};

Client.prototype.peerLocationFind = function (request) {
  return this.sendRequest('peer-location-find', request);
};
