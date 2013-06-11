define(["modules/login", 'jquery', "rolodex/client", "rolodex-presence/client",'modules/util',
    'modules/peer', 'modules/database', 'modules/user-view', 'modules/layout', 'modules/incoming-call', 'modules/peer', 'modules/_transport', 'rolodex/q']
    , function(Login, $, ROLODEX, ROLODEX_PRESENCE,util, Peer, DB, UserView, Layout, IncomingCall, Peer, Transport, Q) {

    var rolodex = new ROLODEX({baseURL: 'http://webrtc.hookflash.me'});

    var rolodexPresnece = new ROLODEX_PRESENCE({
        rolodex: rolodex,
        baseURL: 'http://webrtc.hookflash.me'
    });

    var cookies = util.parseCookies(document.cookie);

    var layout = new Layout({
        el: '#app',
        rolodex: rolodex
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

                        return transport.doAnswer(peer.get('peerContact'), request.to, {
                            session: sessionDescription
                        });

                        peer.set('loaded', true);
                    }, function() {
                        transport.doReject(peer.get('peerContact'), request.to, {session: {type: 'reject'}});
                        peer.destroy();
                        delete peers[request.from];
                    });
            },
            bye: function(msg) {
                var peer = msg && peers[msg.from];
                if (!peer) {
                    return;
                }
                peer.closeConnection();
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

                transport.peerLocationFind(peer.get('peerContact'), caller, {
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
            to: peer.get('peerContact'),
            from: peer.collection.providerUser.get('peerContact'),
            blob: {
                session: {
                    type: 'callend'
                }
            }
        });

        peer.closeConnection();

        this.hangOut();
    });

    var loginView = new Login.View({ cookies: cookies, service: rolodex });
    loginView.$el.appendTo('body');
    loginView.render();

    var isLoggedIn = false,
        isRendered = false,
        isReFetching = false;

    var Collection = Peer.Collection;

    rolodex.on("fetched.services", function(services) {
        if(!isLoggedIn){
            var loggedServices = [],
                servicesIsFetching = [];

            for(var i in services){
                if(services[i].loggedin){
                    loggedServices.push(services[i].sid);
                    if(!services[i].fetching) servicesIsFetching.push(services[i].sid);
                }

            }

            if(loggedServices.length && loggedServices.length === servicesIsFetching.length){
                isLoggedIn = true;
                app();
            } else if(!loggedServices.length){
                loginView.setStatus({ promt: true });
            }
        }

        if(isReFetching){
            if(services[isReFetching].percentFetched === 100){
                layout.syncContacts(null, isReFetching);
                isReFetching = false;
            }
        }
    });

    function app(){
        rolodex.getServices().then(function(services){
            var serviceCollection = new Collection(null, { transport: transport });

            for(serviceID in services){
                if(services[serviceID].loggedin){

                    services[serviceID].hCard['provider'] = serviceID;

                    if(!services[serviceID].hCard['fn']){
                        services[serviceID].hCard['fn'] = services[serviceID].hCard['nickname'];
                    }

                    serviceCollection.add(services[serviceID].hCard);
                }
            }

            return serviceCollection;

        }).then(function(serviceCollection){

                var userView = new UserView({collection: serviceCollection, service: rolodex});

                userView.$el.appendTo('.wrapper .user');
                userView.render();

                userView.on('logout', function(service){
                    layout.logoutService(service);
                });

                layout.on('user-status', function(status){
                    userView.setStatus(status);
                });

                return serviceCollection;

            }).then(function(serviceCollection){

                loginView.setStatus({ fetching: true });

                var deferred = Q.defer();

                rolodex.getContacts(null, {peerContact: /^peer:.*/}).then(function(contacts){
                    var records = [];
                    for(var i in contacts){
                        for(var j in contacts[i]){
                            records.push(contacts[i][j]);
                        }
                    }
                    records = util.sortRecords(records);

                    var fullListOfcontacts = {
                        online: new Collection([], {
                            providerUser: serviceCollection.at(0),
                            transport: transport
                        }),
                        offline : new Collection(records, {
                            providerUser: serviceCollection.at(0),
                            transport: transport
                        })
                    }

                    deferred.resolve({contacts: fullListOfcontacts, services: serviceCollection});

                }).fail(deferred.reject);

                return deferred.promise;

            }).then(function(property){

                layout.render();

                layout.setContacts(property.contacts);
                loginView.remove();

                isRendered = true;

                var contactPresnece = rolodexPresnece.getOnlineContacts();

                for(var i in contactPresnece){
                    layout.trigger('contact.online', i, contactPresnece[i]);
                }

                layout.addInvitePanel(rolodex ,property.services);

            }).done();
    }



    layout.on("contacts.refetching", function(service){
        rolodex.refetchContacts(service).then(function(data){
            if(data.error){
                alert(data.error.message);
                layout.syncContacts(null, service);
            }
            else isReFetching = service;
        });
    });

    layout.on("chat-message", function(peerContact, model, message){
        message.type = "text";
        message.from = peerContact;

        rolodexPresnece.sendMessage(model.get('peerContact'), message);
    });

    rolodexPresnece.on("contact.message", function(peerContact, message) {
        if(message.type === "text"){
            layout.trigger('on-chat-message', peerContact, message);
        }
    });

    rolodexPresnece.on("contact.online", function(peerContact) {
        console.log(peerContact)
        if(isRendered){
            layout.trigger('contact.online', peerContact, 'online');
        }
    });

    rolodexPresnece.on("contact.offline", function(peerContact) {
        console.log(peerContact)
        if(isRendered){
            layout.trigger('contact.online', peerContact, 'offline');
        }

    });

    rolodexPresnece.on("contact.away", function(peerContact) {
        console.log(peerContact)
        if(isRendered){
            layout.trigger('contact.online', peerContact, 'away');
        }
    });

    rolodexPresnece.on("contact.back", function(peerContact) {
        if(isRendered) layout.trigger('contact.online', peerContact, 'back');
    });

    rolodex.on("contact.added", function(uid, info) {
        if(!isRendered) return;
        layout.syncContacts(uid, info, 'added');

        var contactPresnece = rolodexPresnece.getOnlineContacts();
        for(var i in contactPresnece){
            if(i === info['peerContact']) layout.trigger('contact.online', i, contactPresnece[i]);
        }
    });

    rolodex.on("contact.removed", function(uid, info) {
        if(!isRendered) return;
        layout.syncContacts(uid, info, 'removed');
    });

    rolodexPresnece.on("online", function() {
        layout.trigger('user-status', 'online');
    });

    rolodexPresnece.on("offline", function() {
        layout.trigger('user-status', 'offline');
    });

    rolodexPresnece.on("away", function() {
        layout.trigger('user-status', 'away');
    });

    rolodexPresnece.on("back", function() {
        layout.trigger('user-status', 'online');
    });

});
