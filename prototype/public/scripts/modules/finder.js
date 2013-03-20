define(['q'], function (Q) {
  'use strict';

  function Finder(handlers) {
    this.handlers = handlers;
    this.pending = {};
    this.listeners = {};
  }

  Finder.prototype.on = function (name, handler) {
    var list = this.listeners[name];
    if (list) {
      list.push(handler);
    }
    else {
      list = this.listeners[name] = [handler];
    }
  };

  Finder.prototype.off = function (name, handler) {
    var list = this.listeners[name];
    if (list) {
      list.splice(list.indexOf(handler), 1);
      if (!list.length) {
        delete this.listeners[name];
      }
    }
  };

  Finder.prototype.emit = function (name, data) {
    var list = this.listeners[name];
    if (!list) {
      return;
    }
    list.forEach(function (handler) {
      handler(data);
    });
  };

  Finder.prototype.connect = function (url) {
    var finder = this;
    var connection = new WebSocket(url);
    connection.onopen = function () {

    };
    connection.onerror = function (err) {
      finder.emit('error', err);
    };
    connection.onmessage = function (evt) {
      var json = evt.data;
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

    };
  };

// function Client(socket, handlers) {
//   // Hook up JSON serialization to websocket.
//   var client = this;
//   this.handlers = handlers;
//   this.pending = {};
//   socket.on('message', function (json) {
//     try {
//       var message = JSON.parse(json);
//       if (message.request) {
//         client.onRequest(message.request);
//       }
//       else if (message.result) {
//         client.onResult(message.result);
//       }
//       else if (message.reply) {
//         client.onReply(message.reply);
//       }
//       else {
//         throw new Error('Unknown message format');
//       }
//     } catch (err) {
//       client.emit('error', err);
//     }
//   });



  return Finder;
});
