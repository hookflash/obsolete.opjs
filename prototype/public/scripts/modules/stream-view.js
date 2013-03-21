define(['modules/gum-compat', 'backbone'], function(gum, Backbone) {
  'use strict';

  var StreamView = Backbone.View.extend({
    tagName: 'video',
    className: 'stream',
    isPlaying: function() {
      return !this.el.paused;
    },
    // TODO: Derive the current stream from the media element itself (likely
    // through a new method in `gum`).
    getStream: function() {
      return this._stream;
    },
    play: function(stream) {
      this._stream = stream;
      gum.playStream(this.el, stream);
    },
    stop: function() {
      gum.stopStream(this.el);
    }
  });

  return StreamView;
});
