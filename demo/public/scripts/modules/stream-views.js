define([
  'modules/gum-compat', 'text!templates/stream-view-remote.html',
  'text!templates/stream-view-local.html', 'layoutmanager', '_', 'q'
  ], function(gum, remoteHtml, localHtml, Backbone, _, Q) {
  'use strict';

  var StreamView = Backbone.Layout.extend({
    className: 'stream',
    template: _.template(remoteHtml),
    isPlaying: function() {
      var media = this._getMedia();
      return media && !media.paused;
    },
    _getMedia: function() {
      return this.$('video')[0];
    },
    // TODO: Derive the current stream from the media element itself (likely
    // through a new method in `gum`).
    getStream: function() {
      return this._stream;
    },
    play: function(stream) {
      this._play(stream);
      this.render();
    },
    // _play
    // Play the given stream without re-rendering. Intended for use in this
    // view's `afterRender` method (in order to avoid infinite recursion).
    _play: function(stream) {
      var media = this._getMedia();
      if (!media) {
        return;
      }
      this._stream = stream;
      gum.playStream(media, stream);
    },
    stop: function() {
      var media = this._getMedia();
      if (!media) {
        return;
      }
      gum.stopStream(media);
      delete this._stream;
      this.render();
    },
    // Preserve the media element's stream and restore after the view is
    // re-rendered. Without this precaution, active streams would be lost with
    // each re-rending.
    beforeRender: function() {
      this.wasPlaying = this.getStream();
    },
    // Restore the media element's stream after re-rendering. This avoids the
    // loss of stream data across rendering operations.
    afterRender: function() {
      if (this.wasPlaying) {
        this._play(this.wasPlaying);
        delete this.wasPlaying;
      }
    },
    serialize: function() {
      return {
        isPlaying: this.isPlaying()
      };
    }
  });

  var LocalStreamView = StreamView.extend({
    template: _.template(localHtml),
    className: StreamView.prototype.className + ' stream-local',
    requestMedia: function() {
      var dfd = Q.defer();

      gum.getUserMedia({
        video: true,
        audio: true
      }, dfd.resolve.bind(dfd), dfd.reject.bind(dfd));

      dfd.promise.then(this.play.bind(this), this.mediaRejected.bind(this));
      return dfd.promise;
    },
    mediaRejected: function(error) {
      console.error('Unable to set user media.', error);
    }
  });

  return {
    StreamView: StreamView,
    LocalStreamView: LocalStreamView
  };
});
