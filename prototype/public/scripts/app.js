require([
  'modules/peer', 'modules/transport', 'modules/layout', 'modules/incoming-call'
  ], function(Peer, Transport, Layout, IncomingCall) {
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

  var transport = new Transport({
    invite: function(request) {
      var blob = request && request.username && request.username.blob;
      var locationID = request && request.username && request.username.from;
      var remoteSession = blob && blob.session;
      var peer, incomingCall;

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

      peer = new Peer.Model({
        name: blob.userName,
        locationID: locationID
      });
      peer.transport = transport;

      incomingCall = new IncomingCall({ model: peer });
      layout.insertView(incomingCall).render();

      return incomingCall.then(function() {

          peers[locationID] = peer;

          return layout.startCall(peer);
        })
        .then(function(stream) {

          peer.addStream(stream);

          console.log('Creating remote session description:', remoteSession);
          peer.setRemoteDescription(remoteSession);
          console.log('Sending answer...');

          return peer.createAnswer(mediaConstraints);
        })
        .then(function(sessionDescription) {
          peer.setLocalDescription(sessionDescription);

          return {
            peer: true,
            sessionDescription: sessionDescription
          };
        },
        function() {
          console.error('Create answer failed.', arguments);
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
            return peer.createOffer(mediaConstraints);
          })
        .then(function(sessionDescription) {
            peer.setLocalDescription(sessionDescription);
            return transport.peerLocationFind(peer.get('name'), {
              session: sessionDescription,
              userName: user.get('name')
            });
          }, function() {
            console.error('Create offer failed.', arguments);
          })
        .then(function(findReply) {
            peers[findReply.from] = peer;
            peer.setRemoteDescription(findReply.sessionDescription);
            peer.set('locationID', findReply.from);
          }, function() {
            // TODO: Update the UI to reflect this failure.
            console.error('Find request failed.');
          });
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
