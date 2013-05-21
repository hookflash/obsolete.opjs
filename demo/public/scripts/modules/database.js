define(['db', 'backbone', '_', 'rolodex/q'],
    function(ydn, Backbone, _, Q) {
        'use strict';

        var providers = ['github', 'twitter', 'facebook', 'linkedin'];

        var contacts_schema = providers.map(function(item){
            return {
                name: item + 'Contacts',
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{
                    name: 'uid',
                    keyPath: 'uid'
                }, {
                    keyPath: 'fn'
                }, {
                    keyPath: 'nickname'
                }, {
                    keyPath: 'photo'
                }]
            };
        });

        var schema = {
            stores: [{
                name: 'User',
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{
                    name: 'provider',
                    keyPath: 'provider',
                    unique: true
                }, {
                    name: 'uid',
                    keyPath: 'uid'
                }, {
                    keyPath: 'fn'
                }, {
                    keyPath: 'nickname'
                }, {
                    keyPath: 'photo'
                }]
            }].concat(contacts_schema)
        };

        var _db = new ydn.db.Storage('WebRTCContacts', schema);

        var DataBase = function(service){
            this.service = service;
            this.defers = {
                user: Q.defer(),
                contacts: Q.defer(),
                sync: Q.defer()
            };
        };

        DataBase.prototype = Object.create({
            setProvider: function(provider){
                this.provider = provider;
            },
            getUser: function(){
                var deferred = Q.defer();
                var iter = new ydn.db.IndexValueCursors('User', 'provider', ydn.db.KeyRange.only(this.provider));
                var res = _db.values(iter);
                var self = this;

                res.done(function(records) {
                    return records;
                }).then(function(res){
                        if(!res.length){
                            self.service.getServices().then(function(services){
                                var user = services[self.provider].hCard;
                                user.provider = self.provider;
                                _db.put('User', user).then(function(){
                                    deferred.resolve(user);
                                });
                            });
                        } else {
                            deferred.resolve(res[0]);
                        }
                    });
                return deferred.promise
            },
            getContacts: function(){
                var deferred = Q.defer();
                var iter = new ydn.db.IndexValueCursors(this.provider + 'Contacts', 'fn', null, false);
                var res = _db.values(iter);
                var self = this;

                res.done(function(records) {
                    return records;
                }).then(function(res){
                        if(!res.length){
                            self.service.getContacts(self.provider).then(function(contacts){
                                var records = [];
                                for(var i in contacts) records.push(contacts[i]);
                                records.sort(function(a,b){ return a.fn > b.fn ? 1 : -1});

                                _db.put(self.provider + 'Contacts', records).then(function(){
                                    deferred.resolve(records);
                                });
                            });
                        } else {
                            deferred.resolve(res);
                        }
                    });
                return deferred.promise;
            },
            sync: function(){
                var deferred = Q.defer();
                var self = this;
                var refetched;

                self.service.refetchContacts(self.provider).then(function(data){
                    if(data.error){
                        refetched = false;
                        alert(data.error.message);
                        self.service.off("fetched.services", listener);
                        deferred.reject();
                    } else {
                        refetched = true;
                    }
                });

                var listener = function(services){
                    if(refetched){
                        if(services[self.provider].percentFetched && services[self.provider].percentFetched >= 100){

                            self.service.off("fetched.services", listener);

                            self.service.getContacts(self.provider).then(function(contacts){
                                var res = _db.clear(self.provider + 'Contacts');

                                res.done(function() {
                                    var records = [];
                                    for(var i in contacts){
                                        records.push(contacts[i]);
                                    }
                                    records.sort(function(a,b){ return a.fn > b.fn ? 1 : -1});

                                    _db.put(self.provider + 'Contacts', records).then(function(){
                                        deferred.resolve(records);
                                    });
                                });
                            });
                        }
                    }
                };

                self.service.on("fetched.services", listener);

                return deferred.promise;
            },
            search: function(val){
                var iter = new ydn.db.IndexValueCursors(this.provider + 'Contacts', 'fn', ydn.db.KeyRange.starts(val));
                return _db.values(iter);
            }
        });


        return DataBase;
    });

