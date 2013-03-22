require([
  'modules/nder', 'modules/pc', 'modules/layout', 'backbone'
  ], function(Nder, PC, Layout, Backbone) {
  'use strict';

  var config = {
    socketServer: window.location.host,
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
  var layout = new Layout({
    el: '#app',
    contacts: new Backbone.Collection(contacts)
  });
  layout.render();
  layout.on('connectRequest', function(stream) {
    if (!pc.isActive() && nder.is('open')) {
      pc.init(config.pcConfig);
      pc.addStream(stream);
      pc.createOffer(
        setLocalAndSendMessage,
        createOfferFailed,
        mediaConstraints);
    }
  });
  layout.on('hangup', function() {
    nder.send({ type: 'bye' });
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
          // TODO: Refactor so signalling service is not so tightly-coupled to
          // the layout.
          pc.addStream(layout.localStreamView.getStream());
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

});
