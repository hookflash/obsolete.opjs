define([
  'modules/stream-view', 'modules/gum-compat', 'text!templates/layout.html',
  'backbone', '_'
  ], function(StreamView, gum, html, Backbone, _) {
  'use strict';

  var Layout = Backbone.View.extend({
    template: _.template(html),
    events: {
      'click .start-video': 'requestMedia',
      'click .stop-video': 'stopLocalStream',
      'click .connect': 'connect',
      'click .hang-up': 'hangUp'
    },
    initialize: function() {
      this.localStreamView = new StreamView();
      this.remoteStreamView = new StreamView();
      // Shadow prototype method with versions bound to this instance
      this.playLocalStream = _.bind(this.playLocalStream, this);
      this.mediaRejected = _.bind(this.mediaRejected, this);
    },
    requestMedia: function() {
      gum.getUserMedia({
        video: true,
        audio: true
      }, this.playLocalStream, this.mediaRejected);
    },
    playLocalStream: function(stream) {
      this.localStreamView.play(stream);
    },
    playRemoteStream: function(stream) {
      this.remoteStreamView.play(stream);
    },
    mediaRejected: function(error) {
      console.error('Unable to set user media.', error);
    },
    stopLocalStream: function() {
      this.localStreamView.stop();
    },
    stopRemoteStream: function() {
      this.remoteStreamView.stop();
    },
    connect: function() {
      if (this.localStreamView.isPlaying()) {
        this.trigger('connectRequest', this.localStreamView.getStream());
      } else {
        alert('Local stream not running yet - try again.');
      }
    },
    hangUp: function() {
      console.log('Hang up.');
      this.stopRemoteStream();
      this.trigger('hangup');
    },
    render: function() {
      this.$el.html(this.template());
      this.$('.source-stream').append(this.localStreamView.el);
      this.$('.remote-stream').append(this.remoteStreamView.el);
      return this;
    }
  });

  return Layout;
});
