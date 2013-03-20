require([
  'modules/gum-compat', 'modules/peerconn-compat', 'jquery'
  ], function(gum, rtc, $) {
  'use strict';

  var config = {
    socketServer: '10.0.0.202:1337',
    pcConfig: {
      iceServers: [
        { url: 'stun:stun.l.google.com:19302' },
        { url: 'stun:23.21.150.121' }
      ]
    }
  };
  var localStream = null;
  var mediaConstraints = {
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
    }
  };
  var sourceVid = document.getElementById('webrtc-source-vid');
  var remoteVid = document.getElementById('webrtc-remote-vid');
  var $cache = {
    startVideo: $('#start-video'),
    stopVideo: $('#stop-video'),
    connect: $('#connect'),
    hangUp: $('#hang-up')
  };
  var handlers = {
    gum: {
      success: function(stream) {
        localStream = stream;
        gum.playStream(sourceVid, stream);
      },
      failure: function(error) {
        console.error('An error occurred: [CODE ' + error.code + ']');
      }
    },
    user: {
      startVideo: function() {
        gum.getUserMedia({
          video: true,
          audio: true
        }, handlers.gum.success, handlers.gum.failure);
      },
      stopVideo: function() {
        gum.stopStream(sourceVid);
      },
      connect: function() {
        if (!nder.peerConn && localStream && nder.is('open')) {
          nder.createPeerConnection();
          nder.peerConn.createOffer(
            setLocalAndSendMessage.bind(null, nder.peerConn),
            createOfferFailed,
            mediaConstraints);
        } else {
          alert('Local stream not running yet - try again.');
        }
      },
      hangUp: function() {
        console.log('Hang up.');
        nder.send({ type: 'bye' });
        nder.stop();
      }
    }
  };
  function setLocalAndSendMessage(peerConn, sessionDescription) {
    peerConn.setLocalDescription(sessionDescription);
    console.log('Sending SDP:', sessionDescription);
    nder.send(sessionDescription);
  }

  function createOfferFailed() {
    console.log('Create Answer failed');
  }

  function createAnswerFailed() {
    console.log('Create Answer failed');
  }

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
  Nder.prototype.createPeerConnection = function() {
    var peerConn;
    var socket = this.socket;
    try {
      peerConn = this.peerConn = new rtc.RTCPeerConnection(config.pcConfig);
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
        socket.send(JSON.stringify(msg));
      } else {
        console.log('End of candidates.');
      }
    };

    attachStream(peerConn, remoteVid);
    return peerConn;
  };

  function attachStream(peerConn, video) {
    // when remote adds a stream, hand it on to the local video element
    rtc.on(peerConn, 'addstream', function (event) {
      gum.playStream(video, event.stream);
    });
    // when remote removes a stream, remove it from the local video element
    rtc.on(peerConn, 'removestream', function() {
      console.log('Remove remote stream');
      gum.stopStream(video);
    });
    console.log('Adding local stream...');
    peerConn.addStream(localStream);
  }

  var nder = new Nder({
    socket: new WebSocket('ws://' + config.socketServer),
    handlers: {
      offer: function(msg) {
        var sessionDesc;
        console.log('Received offer...');
        if (!this.peerConn) {
          this.createPeerConnection();
        }
        sessionDesc = new rtc.RTCSessionDescription(msg);
        console.log('Creating remote session description:', sessionDesc);
        this.peerConn.setRemoteDescription(sessionDesc);
        console.log('Sending answer...');
        this.peerConn.createAnswer(setLocalAndSendMessage.bind(null, this.peerConn),
          createAnswerFailed, mediaConstraints);
      },
      answer: function(msg) {
        var description;
        if (!this.peerConn) {
          return;
        }
        description = new rtc.RTCSessionDescription(msg);
        console.log('Received answer. Setting remote session description:',
          description);
        this.peerConn.setRemoteDescription(description);
      },
      candidate: function(msg) {
        var candidate;
        if (!this.peerConn) {
          return;
        }
        candidate = new rtc.RTCIceCandidate({
          sdpMLineIndex: msg.sdpMLineIndex,
          sdpMid: msg.sdpMid,
          candidate: msg.candidate
        });
        console.log('Received ICE candidate:', candidate);
        this.peerConn.addIceCandidate(candidate);
      },
      bye: function() {
        if (!this.peerConn) {
          return;
        }
        console.log('Received bye');
        this.stop();
      }
    }
  });

  $cache.startVideo.on('click', handlers.user.startVideo);
  $cache.stopVideo.on('click', handlers.user.stopVideo);
  $cache.connect.on('click', handlers.user.connect);
  $cache.hangUp.on('click', handlers.user.hangUp);
});
