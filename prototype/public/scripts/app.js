require([
  'modules/peer', 'modules/transport', 'modules/layout'
  ], function(Peer, Transport, Layout) {
  'use strict';

  var config = {
    socketServer: 'ws://' + window.location.host
  };
  var user = new Peer.Model();
  // peers
  // A map of location IDs to peer connections.
  var peers = {};

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
      var locationID = request && request.username && request.username.from;
      var remoteSession = blob && blob.session;
      var peer;

      if (!blob) {
        console.error('No blob found. Ignoring invite.');
        return;
      } else if (!locationID) {
        console.error('Location ID not found. Ignoring invite.');
        return;
      } else if (!remoteSession) {
        console.error('Remote session not specified. Ignoring invite.');
        return;
      }

      // TODO: Prompt user to accept/reject call (instead of blindly accepting)
      // and move following logic into "Accept" handler.
      console.log('Receiving call from ' + blob.userName +
        '. Would you like to answer?');

      peers[locationID] = peer = new Peer.Model({
        name: blob.userName,
        locationID: locationID
      });
      peer.transport = transport;

      return layout.startCall(peer).then(function(stream) {

        peer.addStream(stream);

        console.log('Creating remote session description:', remoteSession);
        peer.setRemoteDescription(remoteSession);
        console.log('Sending answer...');

        return peer.createAnswer(mediaConstraints).then(
          function(sessionDescription) {
            peer.setLocalDescription(sessionDescription);

            return {
              peer: true,
              sessionDescription: sessionDescription
            };
          },
          createAnswerFailed);
      });
    },
    bye: function(msg) {
      var peer = msg && peers[msg.from];
      if (!peer) {
        return;
      }
      peer.destroy();
      delete peers[msg.from];
    },
    update: function(msg) {
      var peer = msg && peers[msg.from];
      if (!peer) {
        return;
      }
      console.log('Received ICE candidate:', msg.candidate);
      peer.addIceCandidate(msg.candidate);
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
  contacts.on('send-connect-request', function(peer) {
    if (transport.state === 'OPEN') {

      layout.startCall(peer)
        .then(function() {
          peer.createOffer(mediaConstraints).then(
            function(sessionDescription) {
              peer.setLocalDescription(sessionDescription);
              transport.peerLocationFind(peer.get('name'), {
                session: sessionDescription,
                userName: user.get('name')
              }).then(function(findReply) {
                peers[findReply.from] = peer;
                peer.setRemoteDescription(findReply.sessionDescription);
                peer.set('locationID', findReply.from);
              }, function() {
                // TODO: Update the UI to reflect this failure.
                console.error('Find request failed.');
              });
            },
            createOfferFailed);
        }, function() { console.error(arguments); });
    }
  });
  layout.on('hangup', function(peer) {
    transport.request('bye', {
      to: peer.get('locationID')
    });
    peer.destroy();
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
