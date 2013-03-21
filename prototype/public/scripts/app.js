require([
  'modules/nder', 'modules/pc', 'modules/gum-compat', 'jquery'
  ], function(Nder, PC, gum, $) {
  'use strict';

  var config = {
    socketServer: window.location.hostname + ':1337',
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
          pc.addStream(localStream);
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
    this.setLocalDescription(sessionDescription);
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
        console.log('Received offer...');
        if (!pc.isActive()) {
          pc.init(config.pcConfig);
          pc.addStream(localStream);
        }
        console.log('Creating remote session description:', msg);
        pc.setRemoteDescription(msg);
        console.log('Sending answer...');
        pc.createAnswer(setLocalAndSendMessage,
          createAnswerFailed, mediaConstraints);
      },
      answer: function(msg) {
        if (!pc.isActive()) {
          return;
        }
        console.log('Received answer. Setting remote session description:',
          msg);
        pc.setRemoteDescription(msg);
      },
      candidate: function(msg) {
        if (!pc.isActive()) {
          return;
        }
        console.log('Received ICE candidate:', msg);
        pc.addIceCandidate(msg);
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
