require(['modules/finder', 'modules/gum-compat', 'modules/peerconn-compat', 'jquery'], function(Finder, gum, rtcPeerConn, $) {
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
  var RTCPeerConnection = window.webkitRTCPeerConnection ||
    window.mozRTCPeerConnection;
  var RTCSessionDescription = window.mozRTCSessionDescription ||
    window.RTCSessionDescription;
  var RTCIceCandidate = window.RTCIceCandidate;
  var localStream = null;
  var peerConn = null;
  var started = false;
  var channelReady = false;
  var mediaConstraints = {
    mandatory: {
      OfferToReceiveAudio:true,
      OfferToReceiveVideo:true
    }
  };
  var socket = new WebSocket('ws://' + config.socketServer);
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
        if (!started && localStream && channelReady) {
          createPeerConnection();
          started = true;
          peerConn.createOffer(setLocalAndSendMessage, createOfferFailed, mediaConstraints);
        } else {
          alert('Local stream not running yet - try again.');
        }
      },
      hangUp: function() {
        console.log('Hang up.');
        socket.send(JSON.stringify({type: 'bye'}));
        stop();
      }
    }
  };
  function setLocalAndSendMessage(sessionDescription) {
    peerConn.setLocalDescription(sessionDescription);
    console.log('Sending: SDP');
    console.log(sessionDescription);
    socket.send(JSON.stringify(sessionDescription));
  }

  function createOfferFailed() {
    console.log('Create Answer failed');
  }

  function stop() {
    peerConn.close();
    peerConn = null;
    started = false;
  }

  // socket: channel connected
  socket.addEventListener('message', onMessage, false);
  socket.onmessage = onMessage;
  socket.addEventListener('open', onChannelOpened, false);

  function onChannelOpened() {
    console.log('Channel opened.');
    channelReady = true;
  }

  function createAnswerFailed() {
    console.log('Create Answer failed');
  }
  // socket: accept connection request
  function onMessage(evt) {
    evt = JSON.parse(evt.data);
    if (evt.type === 'offer') {
      console.log('Received offer...');
      if (!started) {
        createPeerConnection();
        started = true;
      }
      console.log('Creating remote session description...' );
      peerConn.setRemoteDescription(new RTCSessionDescription(evt));
      console.log('Sending answer...');
      peerConn.createAnswer(setLocalAndSendMessage, createAnswerFailed, mediaConstraints);

    } else if (evt.type === 'answer' && started) {
      console.log('Received answer...');
      console.log('Setting remote session description...' );
      peerConn.setRemoteDescription(new RTCSessionDescription(evt));

    } else if (evt.type === 'candidate' && started) {
      console.log('Received ICE candidate...');
      var candidate = new RTCIceCandidate({sdpMLineIndex:evt.sdpMLineIndex, sdpMid:evt.sdpMid, candidate:evt.candidate});
      console.log(candidate);
      peerConn.addIceCandidate(candidate);

    } else if (evt.type === 'bye' && started) {
      console.log('Received bye');
      stop();
    }
  }

  function createPeerConnection() {
    try {
      peerConn = new RTCPeerConnection(config.pcConfig);
    } catch (e) {
      console.log('Failed to create PeerConnection, exception: ' + e.message);
    }
    // send any ice candidates to the other peer
    peerConn.onicecandidate = function (evt) {
      if (event.candidate) {
        console.log('Sending ICE candidate...');
        console.log(evt.candidate);
        socket.send(JSON.stringify({type: 'candidate',
                          sdpMLineIndex: evt.candidate.sdpMLineIndex,
                          sdpMid: evt.candidate.sdpMid,
                          candidate: evt.candidate.candidate}));
      } else {
        console.log('End of candidates.');
      }
    };
    console.log('Adding local stream...');
    peerConn.addStream(localStream);

    rtcPeerConn.on(peerConn, 'addstream', onRemoteStreamAdded);
    rtcPeerConn.on(peerConn, 'removestream', onRemoteStreamRemoved);

    // when remote adds a stream, hand it on to the local video element
    function onRemoteStreamAdded(event) {
      console.log('Added remote stream');
      gum.playStream(remoteVid, event.stream);
    }

    // when remote removes a stream, remove it from the local video element
    function onRemoteStreamRemoved() {
      console.log('Remove remote stream');
      gum.stopStream(remoteVid);
    }
  }

  $cache.startVideo.on('click', handlers.user.startVideo);
  $cache.stopVideo.on('click', handlers.user.stopVideo);
  $cache.connect.on('click', handlers.user.connect);
  $cache.hangUp.on('click', handlers.user.hangUp);
});
