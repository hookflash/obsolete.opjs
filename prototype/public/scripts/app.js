require([
  'modules/peer', 'modules/transport', 'modules/layout', 'backbone', 'q'
  ], function(Peer, Transport, Layout, Backbone, Q) {
  'use strict';

  var config = {
    socketServer: 'ws://' + window.location.host
  };
  var user = new Peer.Model();
  // activePeer
  // A global reference to the current call.
  // TODO: Re-factor in order to support multiple simultaneous connections (and
  // remove this variable)
  var activePeer;

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

      if (!activePeer) {
        activePeer = new Peer.Model();
        activePeer.transport = transport;
        activePeer.on('addstream', function(stream) {
          console.log('Remote stream added');
          layout.playRemoteStream(stream);
        });
        activePeer.on('removestream', function() {
          console.log('Remove remote stream');
          layout.stopRemoteStream();
        });
      }
      if (!activePeer.isActive()) {
        activePeer.connect();
        // TODO: Refactor so transport is not so tightly-coupled to the layout.
        // This should also allow recieving calls without sharing the local
        // stream.
        activePeer.addStream(layout.localStreamView.getStream());
      }
      activePeer.set('locationID', request.username.from);
      activePeer.set('name', blob.userName);
      console.log('Creating remote session description:', remoteSession);
      activePeer.setRemoteDescription(remoteSession);
      console.log('Sending answer...');
      var dfd = Q.defer();
      activePeer.createAnswer(function(sessionDescription) {
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
      activePeer.destroy();
    },
    update: function(msg) {
      if (!activePeer.isActive()) {
        return;
      }
      console.log('Received ICE candidate:', msg.candidate);
      activePeer.addIceCandidate(msg.candidate);
    }
  });
  // TODO: Fetch contacts from remote identitiy provider
  var contacts = new Peer.Collection([
    { name: 'creationix' },
    { name: 'robin' },
    { name: 'erik' },
    { name: 'lawrence' },
    { name: 'cassie' },
    { name: 'jugglinmike' }
  ], { transport: transport });
  var layout = new Layout({
    el: '#app',
    user: user,
    contacts: contacts
  });
  layout.render();
  layout.on('send-connect-request', function(peer) {
    if (transport.state === 'OPEN') {

      // TODO: Remove this line and reduce dependence on global state.
      activePeer = peer;

      peer.on('addstream', function(stream) {
        console.log('Remote stream added');
        layout.playRemoteStream(stream);
      });

      peer.createOffer(
        function(sessionDescription) {
          this.setLocalDescription(sessionDescription);
          transport.peerLocationFind(peer.get('name'), {
            session: sessionDescription,
            userName: user.get('name')
          }).then(function(findReply) {
            peer.setRemoteDescription(findReply.sessionDescription);
            peer.set('locationID', findReply.from);
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
      to: activePeer.get('locationID')
    });
    activePeer.destroy();
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
