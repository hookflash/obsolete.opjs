/*global module, define, require*/
( // Module boilerplate to support browser globals, node.js and AMD.
  (typeof module !== 'undefined' && function (m) {
    'use strict';
    module.exports = m(require('q'));
  }) ||
  (typeof define === 'function' && function (m) {
    'use strict';
    define(['q'], m);
  }) ||
  (function (m) {
    'use strict';
    window.Transport = m(window.Q);
  })
)(function (Q) {
  'use strict';

  // Connect to a socket exposing api to the remote end.
  function Transport(api) {
    this.api = api || {};
    this.pending = {};
    this.listeners = {};
    this.socket = undefined;
  }

  // Implement basic EventEmitter style
  Transport.prototype.on = function (name, handler) {
    var list = this.listeners[name];
    if (list) {
      list.push(handler);
    }
    else {
      this.listeners[name] = [handler];
    }
    return this;
  };
  Transport.prototype.off = function (name, handler) {
    var list = this.listeners[name];
    if (list) {
      list.splice(list.indexOf(handler), 1);
      if (!list.length) {
        delete this.listeners[name];
      }
    }
    return this;
  };
  Transport.prototype.emit = function (name, data) {
    var list = this.listeners[name];
    if (!list) {
      if (name === 'error') {
        throw data;
      }
      return this;
    }
    list.forEach(function (handler) {
      handler(data);
    });
    return this;
  };

  // Hook the websocket's readyState to the transport's state
  var STATES = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
  Object.defineProperty(Transport.prototype, 'state', {
    get: function () {
      return this.socket && STATES[this.socket.readyState];
    }
  });

  Transport.prototype.close = function () {
    this.socket.close();
    return this.emit('close');
  };

  // Attach a new socket to the transport.
  Transport.prototype.open = function (socket) {
    // If there was a socket, unplug it.
    if (this.socket) {
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onopen = null;
      this.socket.close();
    }

    // Plug-in the new socket.
    var deferred = Q.defer();
    this.socket = socket;
    var transport = this;
    socket.onmessage = function (evt) {
      var json = evt.data;
      var message;
      try {
        message = JSON.parse(json);
        if (message.request) {
          transport.onRequest(message.request);
        }
        else if (message.result) {
          transport.onResult(message.result);
        }
        else if (message.reply) {
          transport.onReply(message.reply);
        }
        else {
          throw new Error('Unknown message type: ' + json);
        }
      }
      catch (err) {
        transport.emit('error', err);
      }
    };
    socket.onclose = function (evt) {
      transport.emit('closed', evt.reason);
      if (!evt.wasClean) {
        transport.emit('error', new Error(evt.reason));
      }
      deferred.reject();
    };
    socket.onopen = function () {
      transport.emit('opened');
      deferred.resolve();
    };
    this.emit('open');
    return deferred.promise;
  };

  Transport.prototype.result = function (request, result, isReply) {
    var message = {
      $id: request.$id,
      $method: request.$method,
      $timestamp: Date.now() / 1000
    };
    for (var key in result) {
      if (key[0] !== '$') {
        message[key] = result[key];
      }
    }
    if (isReply) {
      console.log('reply', message);
      message = {reply: message};
    }
    else {
      console.log('result', message);
      message = {result: message};
    }

    var json = JSON.stringify(message);
    this.socket.send(json);
  };

  Transport.prototype.request = function (method, request) {
    // Generate a unique random request ID
    // TODO: Use real secure random in real app.
    var id;
    do {
      id = (Math.random() * 0x100000000).toString(32);
    } while (id in this.pending);

    // Generate the metadata for the request
    var message = {
      $id: id,
      $method: method
    };
    for (var key in request) {
      if (key[0] !== '$') {
        message[key] = request[key];
      }
    }
    console.log('request', message);
    message = {request: message};

    var deferred = Q.defer();

    // Serialize the message and send it across the wire.
    var json;
    try {
      json = JSON.stringify(message);
      this.socket.send(json);
    }
    catch (err) {
      deferred.reject(err);
    }

    // It was send, store the pending deferred for later access
    this.pending[id] = deferred;
    // And return the promise.
    return deferred.promise;
  };

  Transport.prototype.onRequest = function (request) {
    console.log('onRequest', request);
    var handler = this.api[request.$method];
    var isReply = false;
    if (!handler && request.$method === 'peer-location-find') {
      handler = this.api.invite;
      isReply = true;
    }
    if (!handler) {
      throw new Error('Unknown request method: ' + request.$method);
    }
    var transport = this;
    Q.fcall(handler, request, this).then(function (result) {
      if (!result) {
        result = {};
      }
      transport.result(request, result, isReply);
    }).fail(function (err) {
      // TODO: What should I do here?
      // What is the proper way to communicate this failure across the wire?
      console.error(err);
    });
  };

  Transport.prototype.onResult = function (result) {
    console.log('onResult', result);
    if (result.$method === 'peer-location-find') {
      return;
    }
    var deferred = this.pending[result.$id];
    if (!deferred) {
      throw new Error('Received result with invalid $id: ' + result.$id);
    }
    delete this.pending[result.$id];
    deferred.resolve(result);
  };

  Transport.prototype.onReply = function (reply) {
    console.log('onReply', reply);
    var deferred = this.pending[reply.$id];
    if (!deferred) {
      return;
      // We don't care about this reply anymore
    }
    // TODO: Allow multiple replies somehow
    delete this.pending[reply.$id];
    deferred.resolve(reply);
  };

  Transport.prototype.sessionCreate = function (username) {
    return this.request('session-create', {
      username: username
    });
  };

  Transport.prototype.peerLocationFind = function (username, blob) {
    return this.request('peer-location-find', {
      username: username,
      blob: blob
    });
  };

  return Transport;

});
