define(function() {
  'use strict';

  // Nder
  // A temporary abstraction around an RTC messaging service
  function Nder(options) {
    var socket = this.socket = new WebSocket('ws://' + options.socketAddr);
    var onMessage = this._onMessage.bind(this);
    this.peerConn = options.peerConn;
    this.handlers = options.handlers;
    socket.addEventListener('message', onMessage, false);
    socket.onmessage = onMessage;
    socket.addEventListener('open', this._onChannelOpened, false);
  }

  Nder.prototype.is = function(stateName) {
    return this.socket && stateName &&
      this.socket.readyState === WebSocket[stateName.toUpperCase()];
  };

  Nder.prototype.send = function(msg) {
    this.socket.send(JSON.stringify(msg));
  };

  Nder.prototype._onMessage = function(event) {
    var msg = JSON.parse(event.data);
    this.trigger(msg.type, msg);
  };

  Nder.prototype._onChannelOpened = function() {
    console.log('Channel opened.');
  };

  Nder.prototype.trigger = function(eventName) {
    var handler = this.handlers[eventName];

    if (typeof handler !== 'function') {
      return;
    }
    handler.apply(this, Array.prototype.slice.call(arguments, 1));
  };

  return Nder;
});
