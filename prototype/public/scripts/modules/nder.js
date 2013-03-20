define(['modules/peerconn-compat', 'modules/gum-compat'], function(rtc, gum) {
  'use strict';

  // Nder
  // A temporary abstraction around an RTC messaging service
  function Nder(options) {
    var socket = this.socket = options.socket;
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

  Nder.prototype.stop = function() {
    this.peerConn.close();
    delete this.peerConn;
  };

  Nder.prototype.createPeerConnection = function(options) {
    var peerConn;
    try {
      peerConn = this.peerConn = new rtc.RTCPeerConnection(options);
    } catch (e) {
      console.log('Failed to create PeerConnection, exception: ' + e.message);
      return null;
    }
    // send any ice candidates to the other peer
    peerConn.onicecandidate = function (evt) {
      var candidate = evt && evt.candidate;
      var msg;
      if (candidate) {
        msg = {
          type: 'candidate',
          sdpMLineIndex: evt.candidate.sdpMLineIndex,
          sdpMid: evt.candidate.sdpMid,
          candidate: evt.candidate.candidate
        };
        console.log('Sending ICE candidate:', msg);
        this.send(msg);
      } else {
        console.log('End of candidates.');
      }
    }.bind(this);
  };
  Nder.prototype.attachStream = function(video, stream) {
    // when remote adds a stream, hand it on to the local video element
    rtc.on(this.peerConn, 'addstream', function (event) {
      gum.playStream(video, event.stream);
    });
    // when remote removes a stream, remove it from the local video element
    rtc.on(this.peerConn, 'removestream', function() {
      console.log('Remove remote stream');
      gum.stopStream(video);
    });
    console.log('Adding local stream...');
    this.peerConn.addStream(stream);
  };

  return Nder;
});
