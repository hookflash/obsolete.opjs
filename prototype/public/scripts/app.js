require([
  'modules/peer', 'modules/transport', 'modules/layout', 'modules/login',
  'modules/incoming-call', 'jquery'
  ], function(Peer, Transport, Layout, Login, IncomingCall, $) {
  'use strict';

  var config = {
    socketServer: 'ws://' + window.location.host
  };
  var user;
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
            sessionDescription: sessionDescription
          };
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
  var layout = new Layout({
    el: '#app'
  });
  layout.on('send-connect-request', function(peer) {
    if (transport.state === 'OPEN') {

      layout.startCall(peer)
        .then(function() {
            return peer.createOffer(mediaConstraints);
          })
        .then(function(sessionDescription) {
            peer.setLocalDescription(sessionDescription);
            return transport.peerLocationFind(peer.getContactId(), {
              session: sessionDescription,
              userName: user.getContactId()
            });
          })
        .then(function(findReply) {
            peers[findReply.from] = peer;
            peer.setRemoteDescription(findReply.sessionDescription);
            peer.set('locationID', findReply.from);
          }, function(reason) {
            layout.endCall(reason);
          });
    }
  });
  layout.on('hangup', function(peer) {
    transport.request('bye', {
      to: peer.get('locationID')
    });
    peer.destroy();
  });

  var loginView = new Login.View();
  loginView.$el.appendTo('body');
  loginView.render();
  loginView
    .then(function(result) {
        var Contacts = result.user.getCollection();
        var contacts = new Contacts(null, {
          transport: transport,
          user: result.user
        });

        $.ajaxPrefilter(result.prefilter);
        user = result.user;
        layout.setContacts(contacts);

        return contacts.fetch();
      })
    .then(function() {
        layout.render();
        return transport.open(new WebSocket(config.socketServer));
      })
    .then(function() {
        console.log('Locked and loaded!');
      }, function(reason) {
        // TODO: Update UI to communicate failure
        console.error('Unable to proceed. Reason: ', reason);
      });
});
