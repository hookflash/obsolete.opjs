require([
  'modules/peer', 'modules/transport', 'modules/layout', 'modules/login',
  'modules/incoming-call', 'modules/util', 'q', 'jquery'
  ], function(Peer, Transport, Layout, Login, IncomingCall, util, Q, $) {
  'use strict';

  var cookies = util.parseCookies(document.cookie);

  var config = {
    socketServer: document.location.origin.toString().replace(/^http/, 'ws')
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
      var isVideo = request && request.username && request.username.blob && request.username.blob.isVideo;

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
      peers[locationID] = peer;

      return incomingCall.then(function() {
            return layout.startCall(peer, isVideo);
        })
        .then(function(stream) {

          peer.addStream(stream);

          console.log('Creating remote session description:', remoteSession);
          peer.setRemoteDescription(remoteSession);
          console.log('Sending answer...');

          console.log("create answer");

          return peer.createAnswer(mediaConstraints);
        })
        .then(function(sessionDescription) {
          peer.setLocalDescription(sessionDescription);

          return {
            sessionDescription: sessionDescription
          };
        }, function() {
          peer.destroy();
          delete peers[locationID];
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
        console.warn('ICE: Rejecting candidate--unknown peer:', msg,
          'Location IDs:', Object.keys(peers));
        return;
      }
      console.log('ICE: Received candidate:', msg.candidate);
      peer.addIceCandidate(msg.candidate);
    },
    getMessage: function(request){
      var blob = request && request.username && request.username.blob;
      var locationID = request && request.username && request.username.from;
      contacts.trigger('on-chat-message', blob, locationID);
    }
  });
  var layout = new Layout({
    el: '#app'
  });
  layout.on('send-connect-request', function(peer, isVideo) {
    if (transport.state === 'OPEN') {

      layout.startCall(peer, isVideo)
        .then(function() {
            return peer.createOffer(mediaConstraints);
          })
        .then(function(sessionDescription) {
            console.log(sessionDescription);
            peer.setLocalDescription(sessionDescription);
            return transport.peerLocationFind(peer.getContactId(), {
              session: sessionDescription,
              userName: user.getContactId(),
              isVideo: isVideo
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

    this.hangOut();
  });

  layout.on('start-chat-conversation', function(peer){
    layout.startChat(peer);
  });

  layout.on("chat-message", function(peer, message){
    transport.sendChatMessage(peer.getContactId(), {
      userName: user.getContactId(),
      message: message
    })
  });

  var contacts;

  var loginView = new Login.View({ cookies: cookies });
  loginView.$el.appendTo('body');
  loginView.render();
  loginView.then(function(result) {

        var prefilter = result.prefilter;

        var Model = result.PeerCtor;
        var Collection = result.PeersCtor;

        user = new Model(null, { transport: transport });
        contacts = new Collection(null, { transport: transport });

        loginView.setStatus({ fetching: true });

        $.ajaxPrefilter(prefilter);
        return Q.all([user.fetch(), contacts.fetch()]).then(function() {

          window.$username = user.get('name');

          layout.setContacts(contacts);
          layout.render();
        });
      })
    .then(function() {
        loginView.setStatus({ connecting: true });
        return transport.open(new WebSocket(config.socketServer));
      })
    .then(function() {
        loginView.remove();
      }, function(reason) {
        loginView.setStatus({ error: reason });
      });
});
