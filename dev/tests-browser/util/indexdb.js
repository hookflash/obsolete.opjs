
define([
	'opjs/indexdb',
	'q/q'
], function (INDEXDB, Q) {

  suite('indexdb', function () {

    test('contacts DB test', function (done) {

    	function init() {
			// @see https://github.com/axemclion/jquery-indexeddb/blob/gh-pages/docs/README.md
			var db = INDEXDB("openpeer-tests-util-indexdb", { 
			    "version" : 1,
			    "upgrade" : function(transaction){
			    },
			    "schema" : {
			        "1" : function(transaction) {
						var contactsStore = transaction.createObjectStore("contacts", {
						    "autoIncrement": false,
						    "keyPath": "uid"
						});
			        }
			    }
			});			
			var deferred = Q.defer();
			db.fail(function(err, event) {
				return deferred.reject(err);
			});
			db.done(function(db, event) {
				return deferred.resolve(db);
			});
			return deferred.promise;
		}

		function remove() {

			var deletePromise = INDEXDB("openpeer-tests-util-indexdb").deleteDatabase();

			var deferred = Q.defer();
			deletePromise.fail(function(err, event) {
				return deferred.reject(err);
			});
			deletePromise.done(function(db, event) {
				return deferred.resolve();
			});
			return deferred.promise;
		}

		var clearContacts = true;
		var contacts = [];
		for (var i=0 ; i<10 ; i++) {
			contacts.push({
				"uid": "uid-" + (i+100),
				"fn": "Name " + i
			});
		}

		return init().then(function() {

			function insertOrRemove() {
				var deferred = Q.defer();
				var transaction = INDEXDB("openpeer-tests-util-indexdb").transaction("contacts");
				transaction.fail(function(event) {
					console.error("[indexdb]", event);
					return deferred.reject(new Error("Transaction failed due to: " + event.type));
				});
				transaction.done(function(event) {
					return deferred.resolve();
				});
				transaction.progress(function(transaction) {
					var contactsStore = transaction.objectStore("contacts");
					contacts.forEach(function(contact) {
						contactsStore.put(contact);
					});
				});
				return deferred.promise.then(function() {
					done();
				}).fail(done);
			}

			if (clearContacts === true) {
				INDEXDB("openpeer-tests-util-indexdb").objectStore("contacts").clear().done(insertOrRemove).fail(done);
			} else {
				insertOrRemove();
			}

		}).fail(done);
    });

  });
});


/*
			function fetchFromDB() {
				var deferred = Q.defer();
				var transaction = self._db.transaction(["contacts"]);
				transaction.fail(function(event) {
					console.error("[rolodex]", event);
					return deferred.reject(new Error("Transaction failed due to: " + event.type));
				});
				var contacts = {};
				transaction.done(function(event) {
					return deferred.resolve(contacts);
				});
				transaction.progress(function(transaction) {
					var contactsStore = transaction.objectStore("contacts");
					contactsStore.each(function(item) {
						if (serviceId) {
							if (item.value.service === serviceId) {
								contacts[item.value.uid.split(":")[1]] = item.value;
							}
						} else {
							if (!contacts[item.value.service]) {
								contacts[item.value.service] = {};
							}
							contacts[item.value.service][item.value.uid.split(":")[1]] = item.value;
						}
					});
				});
				return deferred.promise;
			}
			function doFetchFromServer() {
				var deferred = Q.defer();
				WINDOW.$.ajax({
					method: "POST",
					dataType: "json",
					url: self._options.baseURL + self._routes.contacts + ((serviceId) ? "/"+serviceId : ""),
					xhrFields: {
		                withCredentials: true
		            },
		            crossDomain: true
				}).done(function(data) {
					function syncContactsToDB(serviceId, contacts) {
						var deferred = Q.defer();
						var transaction = self._db.transaction(["contacts"]);
						transaction.fail(function(event) {
							console.error("[rolodex]", event);
							return deferred.reject(new Error("Transaction failed due to: " + event.type));
						});
						transaction.done(function(event) {
							return deferred.resolve();
						});
						transaction.progress(function(transaction) {
							var contactsStore = transaction.objectStore("contacts");
							var newContacts = {};
							for (var contactId in contacts) {
								newContacts[contacts[contactId].uid] = contacts[contactId];
								newContacts[contacts[contactId].uid].service = serviceId;
							}
							contactsStore.each(function(item) {
								if (newContacts[item.key]) {
									// TODO: Compare if different and emit `contact.updated` event.
									item.update(newContacts[item.key]);
									delete newContacts[item.key];
								} else
								if (item.value.service === serviceId) {
									self.emit("contact.removed", item.key, item.value);
									item.delete();
								}
							}).done(function() {
								for (var contactId in newContacts) {
									contactsStore.put(newContacts[contactId]);
									self.emit("contact.added", contactId, newContacts[contactId]);
								}
							});
						});
						return deferred.promise;
					}
*/