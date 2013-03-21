require([
  'modules/nder', 'modules/pc', 'modules/gum-compat',
  'modules/peerconn-compat', 'jquery'
  ], function(Nder, PC, gum, rtc, $) {
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
        if (!pc.isActive() && localStream && nder.is('open')) {
          pc.init(config.pcConfig);
          pc.peerConn.addStream(localStream);
          pc.createOffer(
            setLocalAndSendMessage,
            createOfferFailed,
            mediaConstraints);
        } else {
          alert('Local stream not running yet - try again.');
        }
      },
      hangUp: function() {
        console.log('Hang up.');
        nder.send({ type: 'bye' });
        pc.destroy();
      }
    }
  };
  var setLocalAndSendMessage = function(sessionDescription) {
    this.peerConn.setLocalDescription(sessionDescription);
    console.log('Sending SDP:', sessionDescription);
    nder.send(sessionDescription);
  };

  function createOfferFailed() {
    console.error('Create Answer failed');
  }

  function createAnswerFailed() {
    console.error('Create Answer failed');
  }

  var pc = new PC();
  pc.on('addstream', function(stream) {
    console.log('Remote stream added');
    console.log(arguments);
    gum.playStream(remoteVid, stream);
  });
  pc.on('removestream', function() {
    console.log('Remove remote stream');
    gum.stopStream(remoteVid);
  });
  pc.on('ice', function(msg) {
    console.log('Sending ICE candidate:', msg);
    nder.send(msg);
  });
  var nder = new Nder({
    socketAddr: config.socketServer,
    handlers: {
      offer: function(msg) {
        var sessionDesc;
        console.log('Received offer...');
        if (!pc.isActive()) {
          pc.init(config.pcConfig);
          pc.peerConn.addStream(localStream);
        }
        sessionDesc = new rtc.RTCSessionDescription(msg);
        console.log('Creating remote session description:', sessionDesc);
        pc.peerConn.setRemoteDescription(sessionDesc);
        console.log('Sending answer...');
        pc.createAnswer(setLocalAndSendMessage,
          createAnswerFailed, mediaConstraints);
      },
      answer: function(msg) {
        var description;
        if (!pc.isActive()) {
          return;
        }
        description = new rtc.RTCSessionDescription(msg);
        console.log('Received answer. Setting remote session description:',
          description);
        pc.peerConn.setRemoteDescription(description);
      },
      candidate: function(msg) {
        var candidate;
        if (!pc.isActive()) {
          return;
        }
        candidate = new rtc.RTCIceCandidate({
          sdpMLineIndex: msg.sdpMLineIndex,
          sdpMid: msg.sdpMid,
          candidate: msg.candidate
        });
        console.log('Received ICE candidate:', candidate);
        pc.peerConn.addIceCandidate(candidate);
      },
      bye: function() {
        if (!pc.isActive()) {
          return;
        }
        console.log('Received bye');
        pc.destroy();
      }
    }
  });

  $cache.startVideo.on('click', handlers.user.startVideo);
  $cache.stopVideo.on('click', handlers.user.stopVideo);
  $cache.connect.on('click', handlers.user.connect);
  $cache.hangUp.on('click', handlers.user.hangUp);
});
