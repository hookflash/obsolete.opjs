define(function() {
    'use strict';

    var rtc = {};

    var RTCPeerConnection = rtc.RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

    rtc.RTCSessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;

    rtc.RTCIceCandidate = window.RTCIceCandidate;

    var strats = rtc.strategies = {
        on: {
            moz: function(connection, eventName, handler) {
                connection['on' + eventName] = handler;
            },
            webkit: function(connection, eventName, handler) {
                connection.addEventListener(eventName, handler, false);
            }
        }
    };

    if (RTCPeerConnection && RTCPeerConnection.prototype && 'addEventListener' in RTCPeerConnection.prototype) {

        rtc.on = strats.on.webkit;

    } else {

        rtc.on = strats.on.moz;

    }

    return rtc;
});
