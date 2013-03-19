define(function() {
  'use strict';
  var rtcPeerConn = {};
  var RTCPeerConnection = window.webkitRTCPeerConnection ||
    window.mozRTCPeerConnection;

  var strats = rtcPeerConn.strategies = {
    on: {
      moz: function(connection, eventName, handler) {
        connection['on' + eventName] = handler;
      },
      webkit: function(connection, eventName, handler) {
        connection.addEventListener(eventName, handler, false);
      }
    }
  };

  if (RTCPeerConnection.prototype && 'addEventListener' in RTCPeerConnection.prototype) {
    rtcPeerConn.on = strats.on.webkit;
  } else {
    rtcPeerConn.on = strats.on.moz;
  }

  return rtcPeerConn;
});
