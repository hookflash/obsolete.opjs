define([
    'modules/rtc-compat', 'backbone', 'rolodex/q'
], function(rtc, Backbone, Q) {
    'use strict';

    var Peer = Backbone.Model.extend({
        nameRegex: /^[0-9a-z\.-]+$/i,
        connectOptions: {
            iceServers: [
                { url: 'stun:stun.l.google.com:19302' },
                { url: 'stun:23.21.150.121' }
            ]
        },
        initialize: function(options) {
            if (options && options.connectOptions) {
                this.connectOptions = options.connectOptions;
            }
            // Because ICE candidates may be emitted before a Peer connection is
            // completed, the Peer should store any candidate data it receives and
            // send once the connection is established.
            this._iceBuffer = [];
            this.on('change:loaded', this._flushIceBuffer, this);
        },
        validate: function(attrs) {
            if (!attrs || !attrs.name) {
                return new Error('No username specified');
            } else if (!this.nameRegex.test(attrs.name)) {
                return new Error('Invalid username');
            }
        },
        // getContactId
        // Compose the string contact ID for this peer
        getContactId: function() {
            return this.get('uid');
        },
        // getCollectionCtor
        // Return the constructor for Peers of this type
        getCollection: function() {
            return this.constructor.Peers;
        },
        // getTransport
        // Return a reference to the model's transport. If the model does not
        // define a transport, return a reference to its collection's transport (if
        // available).
        getTransport: function() {
            return this.transport || this.collection && this.collection.transport;
        }
    });

    Peer.prototype.connect = function(options) {
        var peerConn;
        if (this.peerConn) {
            this.closeConnection();
        }
        options = options || this.connectOptions;
        try {
            peerConn = this.peerConn = new rtc.RTCPeerConnection(options);
        } catch (e) {
            console.error('Failed to create PeerConnection, exception: ' + e.message);
            return null;
        }
        // send any ice candidates to the other peer
        peerConn.onicecandidate = this._handleIceCandidate.bind(this);
        rtc.on(peerConn, 'addstream', this._handleAddStream.bind(this));
        rtc.on(peerConn, 'removestream', this._handleRemoveStream.bind(this));
    };

    // addStream
    // Add a stream object to the local stream set of the Peer Connection
    // instance
    Peer.prototype.addStream = function(stream) {
        this.peerConn.addStream(stream);
    };

    // setLocalDescription
    // Create a valid WebRTC Session Description object from the provided data
    // and set it as the local description of the Peer Connection instance
    Peer.prototype.setLocalDescription = function(desc) {
        desc = new rtc.RTCSessionDescription(desc);
        this.peerConn.setLocalDescription(desc);
    };

    // setRemoteDescription
    // Create a valid WebRTC Session Description object from the provided data
    // and set it as the remote description of the Peer Connection instance
    Peer.prototype.setRemoteDescription = function(desc) {
        console.log('Remote Description: ', desc);
        desc = new rtc.RTCSessionDescription(desc);
        this.peerConn.setRemoteDescription(desc);
    };

    // addIceCandidate
    // Create a valid WebRTC Ice Candidate object from the provided data and add
    // it to the Peer Connection instance
    Peer.prototype.addIceCandidate = function(candidateData) {
        var candidate = new rtc.RTCIceCandidate({
            sdpMLineIndex: candidateData.sdpMLineIndex,
            sdpMid: candidateData.sdpMid,
            candidate: candidateData.candidate
        });
        this.peerConn.addIceCandidate(candidate);
    };

    Peer.prototype._handleIceCandidate = function(evt) {

        var candidate = evt && evt.candidate;
        var transport = this.getTransport();
        var from = this.collection.providerUser.get('uid');
//    var locationID = this.get('uid');
//    var msg;


        // If the locationID is unset, the Peer Location Find request has not yet
        // completed. In this case, save the candidate data to a buffer so it may
        // be sent when the request completes.
        if (!this.get('loaded') && this.get('isPestpone')) {
//
            console.log('ICE: Buffering candidate.');
//
            this._iceBuffer.push(evt);
//
        } else if (candidate) {
//      console.log('ICE: Sending candidate.');
            var msg = {
                type: 'candidate',
                sdpMLineIndex: evt.candidate.sdpMLineIndex,
                sdpMid: evt.candidate.sdpMid,
                candidate: evt.candidate.candidate
            };

            transport.request('update', {
                blob: {
                    session: msg
                },
                to: this.get('uid'),
                from: from
            });

        } else {
            console.log('ICE: End of candidates.');
        }
    };

    // _flushIceBuffer
    // Internal method intended to send any ICE candidate data that has been
    // queued while a Peer Location Find request was being processed.
    Peer.prototype._flushIceBuffer = function() {
        var buffer, len;

        // Do not flush the buffer if the location ID is unset
        if (!this.get('uid')) {
            return;
        }

        // Create a temporary copy of the buffer and clear the original prior to
        // re-sending the candidates.
        buffer = this._iceBuffer.slice();
        len = buffer.length;
        console.log('ICE: Flushing ' + len + ' buffered candidate' +
            (len === 1 ? '' : 's') + '.');

        this._iceBuffer.length = 0;

        buffer.forEach(function(evt) {
            this._handleIceCandidate(evt);
        }, this);
    };

    Peer.prototype._handleAddStream = function(event) {
        this.trigger('addstream', event.stream);
    };

    Peer.prototype._handleRemoveStream = function() {
        this.trigger('removestream');
    };

    Peer.prototype.isActive = function() {
        return !!this.peerConn;
    };

    Peer.prototype.createOffer = function(mediaConstraints) {
        var dfd = Q.defer();
        this.peerConn.createOffer(dfd.resolve.bind(dfd), dfd.reject.bind(dfd),
            mediaConstraints);
        return dfd.promise;
    };

    Peer.prototype.createAnswer = function(mediaConstraints) {
        var dfd = Q.defer();
        this.peerConn.createAnswer(dfd.resolve.bind(dfd), dfd.reject.bind(dfd), mediaConstraints);
        return dfd.promise;
    };

    Peer.prototype.closeConnection = function() {
        this.trigger('close.connection');
        this.unset('loaded');
        this.unset('isPestpone');

        this._iceBuffer.length = 0;
        if(this.peerConn){

            console.log('Peer is closed!!!');

            this.peerConn.close();
        }
        delete this.peerConn;
    };

    var Peers = Peer.Peers = Backbone.Collection.extend({
        model: Peer,
        initialize: function(models, options) {
            this.records = models;
            if (options) {
                if (options.transport) this.transport = options.transport;
                if(options.providerUser) this.providerUser = options.providerUser;
            }
        }
    });

    return {
        Model: Peer,
        Collection: Peers
    };
});
