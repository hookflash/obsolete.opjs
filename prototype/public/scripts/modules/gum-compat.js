define(function() {
  'use strict';
  var gum = {};
  var navigator = window.navigator;

  var strats = gum.strategies = {
    playStream: {
      moz: function(videoElem, stream) {
        videoElem.mozSrcObject = stream;
        videoElem.play();
      },
      webkit: function(videoElem, stream) {
        try {
          videoElem.src = gum.URL.createObjectURL(stream);
          videoElem.play();
        } catch(e) {
          console.error('Error setting video src: ', e);
        }
      }
    },
    stopStream: {
      moz: function(videoElem) {
        videoElem.mozSrcObject.stop();
        videoElem.src = null;
      },
      webkit: function(videoElem) {
        videoElem.pause();
        videoElem.src = '';
      }
    }
  };

  // Expose the correct methods according to the environment
  gum.URL = window.URL || window.webkitURL;
  gum.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia || navigator.msGetUserMedia).bind(navigator);
  if ('mozSrcObject' in document.createElement('video')) {
    gum.playStream = strats.playStream.moz;
    gum.stopStream = strats.stopStream.moz;
  } else {
    gum.playStream = strats.playStream.webkit;
    gum.stopStream = strats.stopStream.webkit;
  }

  return gum;
});
