define(["modules/login", 'jquery', "rolodex/client", "rolodex-presence/client",'modules/util',
    'modules/peer', 'modules/database', 'modules/user-view', 'modules/layout', 'modules/incoming-call', 'modules/peer', 'modules/_transport']
    , function(Login, $, ROLODEX, ROLODEX_PRESENCE,util, Peer, DB, UserView, Layout, IncomingCall, Peer, Transport) {

        var rolodex = new ROLODEX({baseURL: 'http://webrtc.hookflash.me'});

        var rolodexPresnece = new ROLODEX_PRESENCE({
            rolodex: rolodex,
            baseURL: 'http://webrtc.hookflash.me'
        });

        var cookies = util.parseCookies(document.cookie);

        var database = new DB(rolodex);

        var layout = new Layout({
            el: '#app'
        });

        var peers = {};

        var mediaConstraints = {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            }
        };

        var transport = new Transport({
            mesanger: rolodexPresnece,
            api: {
                invite: function(request) {
                    var remoteSession = request.blob && request.blob.session;
                    var peer, incomingCall;

                    if (!remoteSession) {
                        console.error('No blob found. Ignoring invite.');
                        return;
                    }

                    peer = layout.getRecord(request.from);
                    incomingCall = new IncomingCall({ model: peer });
                    layout.insertView(incomingCall).render();
                    peers[request.from] = peer;

                    return incomingCall.then(function() {
                        return layout.startCall(peer, true);
                    })
                        .then(function(stream) {
                            peer.addStream(stream);
                            console.log('Creating remote session description:', remoteSession);
                            peer.setRemoteDescription(remoteSession);
                            console.log('Sending answer...');
                            console.log("create answer");
                            return peer.createAnswer(mediaConstraints);

                        })
                        .then(function(sessionDescription) {
                            peer.setLocalDescription(sessionDescription);

                            return transport.doAnswer(peer.get('uid'), request.to, {
                                session: sessionDescription
                            });

                            peer.set('loaded', true);
                        }, function() {
                            transport.doReject(peer.get('uid'), request.to, {session: {type: 'reject'}});
                            peer.destroy();
                            delete peers[request.from];
                        });
                },
                bye: function(msg) {
                    var peer = msg && peers[msg.from];
                    if (!peer) {
                        return;
                    }
                    peer.destroy();
                    delete peers[msg.from];
                },
                update: function(msg) {
                    var peer = msg && peers[msg.from];
                    peer.addIceCandidate(msg.blob.session);
                }
            }
        });

        layout.on('send-connect-request', function(caller, peer, isVideo) {
            peer.set('isPestpone', true);

            layout.startCall(peer, isVideo)
                .then(function() {
                    return peer.createOffer(mediaConstraints);
                })
                .then(function(sessionDescription) {

                    console.log(sessionDescription);

                    peer.setLocalDescription(sessionDescription);

                    transport.peerLocationFind(peer.get('uid'), caller, {
                        session: sessionDescription
                    });

                    transport.on('getReply', function(message){
                        peers[message.from] = peer;
                        peer.setRemoteDescription(message.blob.session);
                        peer.set('loaded', true);
                    });

                    transport.on('rejected', function(){
                        layout.trigger('hangup', peer);
                    })
                });
        });

        layout.on('hangup', function(peer) {
            transport.request('bye', {
                to: peer.get('uid'),
                from: window.from,
                blob: {
                    session: {
                        type: 'callend'
                    }
                }
            });

            peer.destroy();

            this.hangOut();
        });

        var loginView = new Login.View({ cookies: cookies, service: rolodex });
        loginView.$el.appendTo('body');
        loginView.render();

        var isLoggedIn = false;

        rolodex.on("fetched.services", function(services) {
            var currentService = false;

            function renderService(serviceId, service) {
                if (service.loggedin) {
                    currentService = serviceId;
                }
                if(isLoggedIn && service.logoutReason) window.location.reload(true);
            }

            for (var serviceId in services) {
                renderService(serviceId, services[serviceId]);
            }

            if(isLoggedIn) return false;

            if(currentService){

                database.setProvider(currentService);

                var Model = Peer.Model;
                var Collection = Peer.Collection;

                var user = new Model(null, { transport: transport });
                var collection = new Collection(null, { transport: transport });

                loginView.setStatus({ fetching: true });

                database.getUser().then(function(rec){
                    window.from = rec.uid;

                    user.set(rec);

                    var userView = UserView.view({ model: user, service: rolodex, provider: currentService});
                    userView.$el.appendTo('.wrapper .user');
                    userView.render();

                    database.getContacts().then(function(contacts){

                        layout.render();
                        layout.setContacts(database, collection, contacts);
                        loginView.remove();

                        isLoggedIn = true;
                    });

                });
            } else {
                loginView.setStatus({ promt: true });
            }
        });

        layout.on("chat-message", function(uid, model, message){
            message.type = "text";
            rolodexPresnece.sendMessage(model.get('uid'), uid, message);
        });

        rolodexPresnece.on("contact.message", function(to, uid, message) {
            if(message.type === "text"){
                layout.trigger('on-chat-message', uid, message);
            }
        });



        rolodexPresnece.on("contact.online", function(uid) {
            if(isLoggedIn) layout.trigger('contact.online', uid, 'online');
        });

        rolodexPresnece.on("contact.offline", function(uid) {
            if(isLoggedIn) layout.trigger('contact.online', uid, 'offline');
        });

        rolodexPresnece.on("contact.away", function(uid) {
            if(isLoggedIn) layout.trigger('contact.online', uid, 'away');
        });

        rolodexPresnece.on("contact.back", function(uid) {
            if(isLoggedIn) layout.trigger('contact.online', uid, 'online');
        });

//  rolodexPresnece.on("online", function() {
//    console.log("Online");
//  });
//
//  rolodexPresnece.on("offline", function() {
//    console.log("Offline");
//  });
//
//  rolodexPresnece.on("away", function() {
//    console.log("Away");
//  });
//
//  rolodexPresnece.on("back", function() {
//    console.log("Back");
//  });

        $(document).ready(function() {
            rolodex.init();
        });

    });
