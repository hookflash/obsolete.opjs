require([
  'modules/nder', 'modules/gum-compat', 'modules/peerconn-compat', 'jquery'
  ], function(Nder, gum, rtc, $) {
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
          nder.createPeerConnection(config.pcConfig);
          nder.attachStream(remoteVid, localStream);
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

  var nder = new Nder({
    socket: new WebSocket('ws://' + config.socketServer),
    handlers: {
      offer: function(msg) {
        var sessionDesc;
        console.log('Received offer...');
        if (!this.peerConn) {
          this.createPeerConnection(config.pcConfig);
          this.attachStream(remoteVid, localStream);
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
