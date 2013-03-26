define([
  'text!templates/conversation.html', 'modules/stream-views', 'layoutmanager',
  '_'
  ], function(html, StreamViews, Backbone, _) {
  'use strict';

  var ConversationView = Backbone.Layout.extend({
    className: 'conversation',
    template: _.template(html),
    events: {
      'click .btn-hang-up': 'hangUp'
    },
    initialize: function() {
      this.localStreamView = new StreamViews.LocalStreamView();
      this.remoteStreamView = new StreamViews.StreamView();
      this.setView('.source', this.localStreamView);
      this.setView('.remote', this.remoteStreamView);
    },
    startCall: function(peer) {
      // TODO: Re-factor to support multiple remote peers
      if (this.peer) {
        this.stopListening(this.peer);
      }
      this.peer = peer;
      this.listenTo(this.peer, 'addstream', function(stream) {
        console.log('Remote stream added');
        this.playRemoteStream(stream);
      });
      this.listenTo(this.peer, 'removestream', function() {
        console.log('Remove remote stream');
        this.stopRemoteStream();
      });

      return this.localStreamView.requestMedia().then(function(stream) {
        peer.addStream(stream);
        return stream;
      });
    },
    hangUp: function() {
      console.log('Hang up.');
      this.stopRemoteStream();
      this.trigger('hangup', this.peer);
    },
    playLocalStream: function(stream) {
      //this.localStreamView.play(stream);
      this.peer.addStream(stream);
    },
    playRemoteStream: function(stream) {
      this.remoteStreamView.play(stream);
      this.render();
    },
    stopLocalStream: function() {
      this.localStreamView.stop();
      // TODO: implement Peer#removeStream
    },
    stopRemoteStream: function() {
      this.remoteStreamView.stop();
      this.render();
    },
    serialize: function() {
      return {
        isPlaying: this.remoteStreamView.isPlaying()
      };
    }
  });

  return ConversationView;
});
