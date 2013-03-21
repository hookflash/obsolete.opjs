define([
    'modules/peerconn-compat', '_', 'backbone'
  ], function(rtc, _, Backbone) {
  'use strict';

  function PC() {
  }

  _.extend(PC.prototype, Backbone.Events);

  PC.prototype.init = function(options) {
    var peerConn;
    if (this.peerConn) {
      this.destroy();
    }
    try {
      peerConn = this.peerConn = new rtc.RTCPeerConnection(options);
    } catch (e) {
      console.error('Failed to create PeerConnection, exception: ' + e.message);
      return null;
    }
    // send any ice candidates to the other peer
    peerConn.onicecandidate = this._handleIceCandidate.bind(this);
    rtc.on(peerConn, 'addstream', this._handleAddStream.bind(this));
    rtc.on(peerConn, 'removestream', this._handleRemoveStream.bind(this));
  };

  PC.prototype._handleIceCandidate = function(evt) {
    var candidate = evt && evt.candidate;
    var msg;
    if (candidate) {
      msg = {
        type: 'candidate',
        sdpMLineIndex: evt.candidate.sdpMLineIndex,
        sdpMid: evt.candidate.sdpMid,
        candidate: evt.candidate.candidate
      };
      this.trigger('ice', msg);
    } else {
      console.log('End of candidates.');
    }
  };

  PC.prototype._handleAddStream = function(event) {
    this.trigger('addstream', event.stream);
  };

  PC.prototype._handleRemoveStream = function() {
    this.trigger('removestream');
  };

  PC.prototype.isActive = function() {
    return !!this.peerConn;
  };

  // TODO: Avoid binding
  PC.prototype.createOffer = function(success, failure, mediaConstraints) {
    if (typeof success === 'function') {
      success = success.bind(this);
    }
    if (typeof failure === 'function') {
      failure = failure.bind(this);
    }
    this.peerConn.createOffer(success, failure, mediaConstraints);
  };

  // TODO: Avoid binding
  PC.prototype.createAnswer = function(success, failure, mediaConstraints) {
    if (typeof success === 'function') {
      success = success.bind(this);
    }
    if (typeof failure === 'function') {
      failure = failure.bind(this);
    }
    this.peerConn.createAnswer(success, failure, mediaConstraints);
  };

  PC.prototype.destroy = function() {
    this.trigger('destroy');
    this.peerConn.close();
    delete this.peerConn;
  };

  return PC;
});
