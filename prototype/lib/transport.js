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
        throw new Error('Unknown message type');
      }
      catch (err) {
        transport.emit('error', err);
      }
    };
    socket.onclose = function (evt) {
      if (evt.wasClean) {
        transport.emit('closed', evt.reason);
      }
      else {
        transport.emit('error', new Error(evt.reason));
      }
    };
    socket.onopen = function () {
      transport.emit('opened');
    };
    return this.emit('open');
  };

  Transport.prototype.request = function (method, request) {
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
    var handler = this.api[request.$method];
    if (!handler) {
      throw new Error('Unknown request method: ' + request.$method);
    }
    handler(request).then(function (result) {
      console.log(result);
      throw new Error('TODO: send the result back to the caller');
    }, function (err) {
      // TODO: What should I do here?
      throw err;
    });
  };

  Transport.prototype.onResult = function (result) {
    var deferred = this.pending[result.$id];
    if (!deferred) {
      throw new Error('Received result with invalid $id: ' + result.$id);
    }
    delete this.pending[result.$id];
    deferred.resolve(result);
  };

  Transport.prototype.onReply = function (reply) {
    var handler = this.api.reply;
    if (!handler) {
      throw new Error('Missing reply api handler');
    }
    handler(reply);
  };

  return Transport;

});
