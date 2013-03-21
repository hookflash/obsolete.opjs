define([
    'modules/rtc-compat', '_', 'backbone'
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

  PC.prototype.createOffer = function(success, failure, mediaConstraints) {
    var cbs = this._wrapCallbacks({
      success: success,
      failure: failure
    });
    this.peerConn.createOffer(cbs.success, cbs.failure, mediaConstraints);
  };

  PC.prototype.createAnswer = function(success, failure, mediaConstraints) {
    var cbs = this._wrapCallbacks({
      success: success,
      failure: failure
    });
    this.peerConn.createAnswer(cbs.success, cbs.failure, mediaConstraints);
  };

  // _wrapCallbacks
  // Private method to create callbacks that will be invoked in the context of
  // the PC object. Avoiding `Function.prototype.bind` allows users to
  // optionally override the context of their callback functions.
  PC.prototype._wrapCallbacks = function(callbacks) {
    var self = this;
    var success = callbacks.success;
    var failure = callbacks.failure;
    if (typeof success === 'function') {
      callbacks.success = function() {
        success.apply(self, arguments);
      };
    }
    if (typeof failure === 'function') {
      callbacks.failure = function() {
        failure.apply(self, arguments);
      };
    }
    return callbacks;
  };

  PC.prototype.destroy = function() {
    this.trigger('destroy');
    this.peerConn.close();
    delete this.peerConn;
  };

  return PC;
});
