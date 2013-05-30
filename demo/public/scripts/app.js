define(["modules/login", 'jquery', "rolodex/client", "rolodex-presence/client",'modules/util',
    'modules/peer', 'modules/database', 'modules/user-view', 'modules/layout', 'modules/incoming-call', 'modules/peer', 'modules/_transport', 'rolodex/q']
    , function(Login, $, ROLODEX, ROLODEX_PRESENCE,util, Peer, DB, UserView, Layout, IncomingCall, Peer, Transport, Q) {

    var rolodex = new ROLODEX({baseURL: 'http://webrtc.hookflash.me'});

    var rolodexPresnece = new ROLODEX_PRESENCE({
        rolodex: rolodex,
        baseURL: 'http://webrtc.hookflash.me'
    });

    var sortRecords = function(contacts){
        var records = [];
        for(var i in contacts) records.push(contacts[i]);
        records.sort(function(a,b){
            a.fn = a.fn || a.nickname;
            b.fn = b.fn || b.nickname;
            return a.fn > b.fn ? 1 : -1
        });

        return records;
    }

    var cookies = util.parseCookies(document.cookie);

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
            from: peer.collection.providerUser.get('uid'),
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

    var isLoggedIn = false;

    var Collection = Peer.Collection;

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

        if(!serviceCollection.length) loginView.setStatus({ promt: true });
        else return serviceCollection;

    }).then(function(serviceCollection){

       var userView = new UserView({collection: serviceCollection, service: rolodex});

       userView.$el.appendTo('.wrapper .user');
       userView.render();

       userView.on('logout', function(service){
           layout.logoutService(service);
       });

       return serviceCollection;

    }).then(function(serviceCollection){

        loginView.setStatus({ fetching: true });

        var deferred = Q.defer();
        var index = 0;
        var fullListOfcontacts = {};

        (function getContacts(){

            rolodex.getContacts(serviceCollection.at(index).get('provider')).then(function(contacts){

                var records = sortRecords(contacts);

                fullListOfcontacts[serviceCollection.at(index).get('provider')] = new Collection(records, {
                    providerUser: serviceCollection.at(index),
                    transport: transport
                });

                if(index < (serviceCollection.length - 1)){
                    index++;
                    getContacts();
                } else {
                    deferred.resolve(fullListOfcontacts);
                }
            }).fail(deferred.reject);

        })();

        return deferred.promise;

    }).then(function(contacts){
    
        layout.render();

        layout.setContacts(contacts);
        loginView.remove();
        isLoggedIn = true;

    }).done();


    var isReFetching = false;
    rolodex.on("fetched.services", function(services) {
        if(!isReFetching) return;

        if(services[isReFetching].percentFetched === 100){
            rolodex.getContacts(isReFetching, true).then(function(contacts){
                var records = sortRecords(contacts);
                layout.syncContacts(records, isReFetching);
                isReFetching = false;
            });
        }
    });

    layout.on("contacts.refetching", function(service){
        rolodex.refetchContacts(service).then(function(data){
            if(data.error){
                alert(data.error.message);
                layout.syncContacts(null, service);
            } else {
                isReFetching = service;
            }
        });
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

});
