require([
  'modules/user', 'modules/transport', 'modules/pc', 'modules/layout',
  'backbone', 'q'
  ], function(User, Transport, PC, Layout, Backbone, Q) {
  'use strict';

  var config = {
    socketServer: 'ws://' + window.location.host,
    pcConfig: {
      iceServers: [
        { url: 'stun:stun.l.google.com:19302' },
        { url: 'stun:23.21.150.121' }
      ]
    }
  };
  // TODO: Fetch contacts from remote identitiy provider
  var contacts = [
    { name: 'creationix' },
    { name: 'robin' },
    { name: 'erik' },
    { name: 'lawrence' },
    { name: 'cassie' },
    { name: 'jugglinmike' }
  ];
  var mediaConstraints = {
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
    }
  };

  function createOfferFailed() {
    console.error('Create Answer failed');
  }

  function createAnswerFailed() {
    console.error('Create Answer failed');
  }

  var user = new User();
  var pc = new PC();
  var layout = new Layout({
    el: '#app',
    user: user,
    contacts: new Backbone.Collection(contacts)
  });
  layout.render();
  layout.on('connectRequest', function(stream) {
    // TODO: Derive remote peer ID from application state
    var remotePeerID = 'creationix';
    if (!pc.isActive() && transport.state === 'OPEN') {

      pc.init(config.pcConfig);
      pc.addStream(stream);
      pc.createOffer(
        function(sessionDescription) {
          this.setLocalDescription(sessionDescription);
          transport.peerLocationFind(remotePeerID, {
            session: sessionDescription,
            userName: user.get('name')
          }).then(function(findReply) {
            console.log('Promise Resolved', findReply);
            pc.setRemoteDescription(findReply.sessionDescription);
            window.TO_ID = findReply.from;
          }, function() {
            // TODO: Update the UI to reflect this failure.
            console.error('Find request failed.');
          });
        },
        createOfferFailed,
        mediaConstraints);
    }
  });
  layout.on('hangup', function() {
    transport.request('bye', {
      to: window.TO_ID
    });
    pc.destroy();
  });
  pc.on('addstream', function(stream) {
    console.log('Remote stream added');
    layout.playRemoteStream(stream);
  });
  pc.on('removestream', function() {
    console.log('Remove remote stream');
    layout.stopRemoteStream();
  });
  pc.on('ice', function(candidate) {
    console.log('Sending ICE candidate:', candidate);
    transport.request('update', {
      candidate: candidate,
      to: window.TO_ID
    });
  });
  var transport = new Transport({
    invite: function(request) {
      var blob = request && request.username && request.username.blob;
      var remoteSession;
      if (!blob) {
        console.error('No blob found. Ignoring invite.');
        return;
      }
      remoteSession = blob.session;
      if (!remoteSession) {
        console.error('Remote session not specified. Ignoring invite.');
        return;
      }

      // TODO: Prompt user to accept/reject call (instead of blindly accepting)
      // and move following logic into "Accept" handler.
      console.log('Receiving call from ' + blob.userName +
        '. Would you like to answer?');

      if (!pc.isActive()) {
        pc.init(config.pcConfig);
        // TODO: Refactor so transport is not so tightly-coupled to the layout.
        // This should also allow recieving calls without sharing the local
        // stream.
        pc.addStream(layout.localStreamView.getStream());
      }
      window.TO_ID = request.username.from;
      console.log('Creating remote session description:', remoteSession);
      pc.setRemoteDescription(remoteSession);
      console.log('Sending answer...');
      var dfd = Q.defer();
      pc.createAnswer(function(sessionDescription) {
          this.setLocalDescription(sessionDescription);
          dfd.resolve({
            peer: true,
            sessionDescription: sessionDescription
          });
        },
        createAnswerFailed, mediaConstraints);
      return dfd.promise;
    },
    bye: function() {
      pc.destroy();
    },
    update: function(msg) {
      if (!pc.isActive()) {
        return;
      }
      console.log('Received ICE candidate:', msg.candidate);
      pc.addIceCandidate(msg.candidate);
    }
  });

  user.on('change:name', function() {
    transport.open(new WebSocket(config.socketServer))
      .then(function() {
        return transport.sessionCreate(user.get('name'));
      })
      .then(function() {
        // Simulate network latency
        setTimeout(function() {
          layout.login();
        }, 800);
      }, console.error.bind(console));
  });

});
