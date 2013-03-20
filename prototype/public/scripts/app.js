require(['modules/gum-compat', 'modules/peerconn-compat', 'jquery'], function(gum, rtc, $) {
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
  var peerConn = null;
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
        if (!peerConn && localStream && channelReady) {
          peerConn = createPeerConnection(socket);
          peerConn.createOffer(setLocalAndSendMessage.bind(null, peerConn), createOfferFailed, mediaConstraints);
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
  function setLocalAndSendMessage(peerConn, sessionDescription) {
    peerConn.setLocalDescription(sessionDescription);
    console.log('Sending SDP:', sessionDescription);
    socket.send(JSON.stringify(sessionDescription));
  }

  function createOfferFailed() {
    console.log('Create Answer failed');
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
  var socketEvents = {
    offer: function(msg) {
      console.log('Received offer...');
      if (!peerConn) {
        peerConn = createPeerConnection(socket);
      }
      console.log('Creating remote session description...' );
      peerConn.setRemoteDescription(new rtc.RTCSessionDescription(msg));
      console.log('Sending answer...');
      peerConn.createAnswer(setLocalAndSendMessage.bind(null, peerConn), createAnswerFailed, mediaConstraints);
    },
    answer: function(msg) {
      var description = new rtc.RTCSessionDescription(msg);
      console.log('Received answer. Setting remote session description:',
        description);
      peerConn.setRemoteDescription(description);
    },
    candidate: function(msg) {
      var candidate = new rtc.RTCIceCandidate({
        sdpMLineIndex: msg.sdpMLineIndex,
        sdpMid: msg.sdpMid,
        candidate: msg.candidate
      });
      console.log('Received ICE candidate:', candidate);
      peerConn.addIceCandidate(candidate);
    },
    bye: function() {
      console.log('Received bye');
      stop();
    }
  };
  function stop() {
    peerConn.close();
    peerConn = null;
  }
  function onMessage(evt) {
    var msg = JSON.parse(evt.data);
    if (msg.type === 'offer') {
      socketEvents.offer(msg);
    } else if (msg.type === 'answer' && peerConn) {
      socketEvents.answer(msg);
    } else if (msg.type === 'candidate' && peerConn) {
      socketEvents.candidate(msg);
    } else if (msg.type === 'bye' && peerConn) {
      socketEvents.bye(msg);
    }
  }

  function createPeerConnection(socket) {
    var peerConn;
    try {
      peerConn = new rtc.RTCPeerConnection(config.pcConfig);
    } catch (e) {
      console.log('Failed to create PeerConnection, exception: ' + e.message);
      return null;
    }
    // send any ice candidates to the other peer
    peerConn.onicecandidate = function (evt) {
      if (evt.candidate) {
        console.log('Sending ICE candidate:', evt.candidate);
        socket.send(JSON.stringify({type: 'candidate',
                          sdpMLineIndex: evt.candidate.sdpMLineIndex,
                          sdpMid: evt.candidate.sdpMid,
                          candidate: evt.candidate.candidate}));
      } else {
        console.log('End of candidates.');
      }
    };

    attachStream(peerConn, remoteVid);
    return peerConn;
  }

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

  $cache.startVideo.on('click', handlers.user.startVideo);
  $cache.stopVideo.on('click', handlers.user.stopVideo);
  $cache.connect.on('click', handlers.user.connect);
  $cache.hangUp.on('click', handlers.user.hangUp);
});
