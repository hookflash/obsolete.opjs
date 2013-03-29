define([
  'modules/rtc-compat', 'backbone', 'q'
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
      return this.get('name') + '@' + this.get('domain');
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
      this.destroy();
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
    var msg;
    if (candidate && transport) {
      msg = {
        type: 'candidate',
        sdpMLineIndex: evt.candidate.sdpMLineIndex,
        sdpMid: evt.candidate.sdpMid,
        candidate: evt.candidate.candidate
      };
      transport.request('update', {
        candidate: msg,
        to: this.get('locationID')
      });
    } else {
      console.log('End of candidates.');
    }
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
    this.peerConn.createAnswer(dfd.resolve.bind(dfd), dfd.reject.bind(dfd),
        mediaConstraints);
    return dfd.promise;
  };

  Peer.prototype.destroy = function() {
    this.trigger('destroy');
    this.peerConn.close();
    delete this.peerConn;
  };

  var Peers = Peer.Peers = Backbone.Collection.extend({
    model: Peer,
    initialize: function(models, options) {
      if (options) {
        if (options.transport) {
          this.transport = options.transport;
        }
        // Make Peer collections aware of the user they have been created for
        // so they can properly fetch their own data.
        if (options.user) {
          this.user = options.user;
        }
      }
    }
  });

  // models
  // Map of identity provider name to specialized Peer Model constructor.
  // These specialized Models have the following responsibilities:
  // - Defining HTTP endpoints for fetching (via the `url` method)
  // - Normalizing model data (via the `parse` method)
  var models = {};

  models.GitHub = Peer.extend({
    defaults: {
      domain: 'github'
    },
    url: function() {
      var name = this.get('name');
      if (!name) {
        return 'https://api.github.com/user';
      } else {
        return 'https://api.github.com/users/' + name;
      }
    },
    parse: function(attrs) {
      var whitelist = {};
      whitelist.name = attrs.login;
      whitelist.avatarUrl = attrs.avatar_url;
      return whitelist;
    }
  });

  models.GitHub.Peers = Peers.extend({
    model: models.GitHub,
    url: function() {
      var name = this.user && this.user.get('name');
      if (!name) {
        return 'https://api.github.com/user/following';
      } else {
        return 'https://api.github.com/users/' + name + '/following';
      }
    }
  });

  return {
    Model: Peer,
    models: models,
    Collection: Peers
  };
});
