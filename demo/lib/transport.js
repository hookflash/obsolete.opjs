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
        else if (message.fail) {
          transport.onFail(message.fail);
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
      if (evt.wasClean === false && evt.reason) {
        transport.emit('error', evt.reason);
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

  Transport.prototype.fail = function (request, reason) {
    if (reason instanceof Error) {
      reason = reason.stack;
    }
    var message = {
      $id: request.$id,
      $timestamp: Math.floor(Date.now() / 1000),
      $reason: reason
    };
    message = {fail: message};

    var json = JSON.stringify(message);
    this.socket.send(json);
  };

  Transport.prototype.result = function (request, result, isReply) {
    var message = {
      $id: request.$id,
      $method: request.$method,
      $timestamp: Math.floor(Date.now() / 1000)
    };
    for (var key in result) {
      if (key[0] !== '$') {
        message[key] = result[key];
      }
    }
    if (isReply) {
      message = {reply: message};
    }
    else {
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

  Transport.prototype.onFail = function (fail) {
    var deferred = this.pending[fail.$id];
    if (!deferred) {
      throw new Error('Received failure with invalid $id: ' + fail.$id);
    }
    delete this.pending[fail.$id];
    deferred.reject(fail.$reason);
  };

  Transport.prototype.onRequest = function (request) {
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
      // We send a custom message type to forward the failed promise.
      // TODO: find a way to do this within the openpeer protocol.
      transport.fail(request, err);
    });
  };

  Transport.prototype.onResult = function (result) {
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
