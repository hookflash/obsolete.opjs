
define([
  'opjs/ws',
  'q/q',
  'opjs/events',
  'opjs/assert',
  'opjs/util'
], function (WS, Q, Events, Assert, Util) {

  'use strict';

  /**
   * Responsible for maintain a connection to the finder.
   * Lifecycle is tied to the finder. If the finder connection closes then
   * the object must die and be replaced with a new object.
   */
  function AccountFinder(account) {
  	var self = this;

  	self._account = account;

  	self._ready = self._connect();

    self._connectionIndex = 0;
    self._connection = null;
    self._session = null;

  	account.once("destroy", function() {
  		self._ready = null;
      self.emit("destroy");
  	});
  }

  AccountFinder.prototype = Object.create(Events.prototype);

  AccountFinder.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  AccountFinder.prototype.isConnected = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    if (!this._connection) return false;
    return this._connectionIndex;
  }

  AccountFinder.prototype._connect = function() {
  	var self = this;
    if (self._ready === null) return Q.reject(new Error("Object has been destroyed"));
    if (self._connection) {
      return Q.resolve();
    }
    function connectToFinder(wsUri) {
      // Create websocket connection.
      return WS.connectTo(wsUri).then(function(connection) {

        // TODO: Tweak reconnect timeouts.
        var reconnectCount = 0;
        function reconnect() {
          // We had too many reconnect attempts so we throttle back.
          if (reconnectCount > 3) {
            console.error("[AccountFinder] " + reconnectCount + " reconnect attempts failed. Trying again in 30 seconds.");
            var timeoutId = setTimeout(function() {
              timeoutId = null;
              reconnectCount = 0;
              return reconnect();
            }, 30 * 1000);
            self.on("destroy", function() {
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
            });
            return;
          }
          // Try to connect by going through all finders.
          reconnectCount += 1;
          console.log("[AccountFinder] Attempting reconnect: " + reconnectCount);
          return self._connect().then(function() {
            reconnectCount = 0;
            console.log("[AccountFinder] Reconnect successful!");
          }, function(err) {
            console.log(err);
            console.log("[AccountFinder] Re-connect failed.");
            var timeoutId = setTimeout(function() {
              timeoutId = null;
              return reconnect();
            }, 1 * 1000);
            self.on("destroy", function() {
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
            });
            return;
          });
        }

        // If socket closes we try and re-connect (going through all finders) unless
        // we have been destroyed.
        connection.once("close", function() {
          self._connection = null;
          console.log("[AccountFinder] Connection to '" + wsUri + "' closed.");
          if (self._ready === null) return;
          console.log("[AccountFinder] Trigger reconnect.");
          return reconnect();
        });

        return connection;
      });
    }

    // Ask bootstrapper for a few finders to connect to.
    return self._account.getBootstrapper().getFinders().then(function(finders) {
      if (!finders || finders.length === 0) {
        throw new Error("[AccountFinder] No `finders` returned by `Bootstrapper.getFinders()`");
      }
      // Try each finder in trun until we successfully connect to one.
      var done = Q();
      finders.forEach(function(finder) {
        Assert.isObject(finder);
        Assert.isString(finder.wsUri);
        var wsUri = finder.wsUri;
        done = Q.when(done, function() {
          // We are connected so we can skip the remainder.
          if (self._connection) return;
          // Try to connect to finder.
          return connectToFinder(wsUri).then(function(connection) {
            if (connection) {
              self._connectionIndex += 1;
              if (self._connection) {
                throw new Error("[AccountFinder] Old connection exists! It should have been destroyed previously.");
              }
              self._connection = connection;
              console.log("[AccountFinder] Connection to '" + wsUri + "' success!");
              if (self._session) {
                throw new Error("[AccountFinder] Old session exists! It should have been destroyed previously.");
              }
              self._session = new AccountFinderSession(self._account, self._connection, {
                finderID: finder.$id
              });
              self._session.once("destroy", function() {
                self._session = null;
                if (self._connection) {
                  self._connection.close();
                }
              });
              return self._session.ready();
            }
            return;
          }, function(err) {
            console.log("[AccountFinder] Connection to '" + wsUri + "' failed. Trying next one.");
            return;
          });
        });
      });
      return Q.when(done, function() {
        if (self._connection) return;
        throw new Error("[AccountFinder] Unable to connect to any!");
      });
    });
  }


  function AccountFinderSession(account, connection, options) {
    var self = this;
    Assert.isObject(options);
    Assert.isString(options.finderID);
    self._account = account;
    self._connection = connection;

    function destroy() {
      function deleteSession() {
        if (!self._connection) {
          return Q.resolve();
        }
        console.log("[AccountFinderSession] Deleting '" + self._id + "'");
        return self._connection.makeRequestTo("peer-finder", "session-delete", {
          "locations": {
            "location": [
              {
                "$id": self._account.getLocation().getID()
              }
            ]
          }
        }).then(function(result) {
          Assert.isObject(result);
          Assert.isObject(result.locations);
          Assert.isArray(result.locations.location);

          // TODO: Verify that our locationID (passed above) is in `result.locations.location`?

          console.log("[AccountFinderSession] Deleted '" + self._id + "'");
        }).fail(function(err) {
          // Ignore errors.
        });
      }
      self._ready = null;
      return deleteSession().then(function() {
        self._account = null;
        self._connection = null;
        console.log("[AccountFinderSession] Closed '" + self._id + "'");
        self._id = null;
        self.emit("destroy");
      });
    }
    self._connection.once("close", function() {
      if (!self._id) return;
      self._connection = null;
      destroy();
    });
    self._account.once("destroy", function() {
      if (!self._id) return;
      destroy();
    });

    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerFinderProtocol-SessionCreateRequest
    // Session ID
    self._id = Util.randomHex(32);
    console.log("[AccountFinderSession] Creating '" + self._id + "'");
    self._ready = self._connection.makeRequestTo("peer-finder", "session-create", {
      "sessionProofBundle": {
        "sessionProof": {
          "$id": self._id,
          "finder": {
            "$id": options.finderID
          },
          // Client nonce - cryptographically random one time use key
          "clientNonce": Util.randomHex(32),
          // Expiry for the one time use token
          "expires": (Date.now()/1000) + 60,  // 60 seconds from now
          "location": self._account.getLocation().getPayload(),
          "peer": {
            "$version": "1",
            "sectionBundle": {
              "section": {
                "$id": "A"
              }
            }
          }
        },
        "signature": {
          "reference": "#6fc5c4ea068698ab31b6b6f75666808f",
          "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
          "digestValue": "IUe324k...oV5/A8Q38Gj45i4jddX=",
          "digestSigned": "MDAwMDAw...MGJ5dGVzLiBQbGVhc2UsIGQ=",
          "key": { "uri": "peer://example.com/920bd1d88e4cc3ba0f95e24ea9168e272ff03b3b" }
        }
      }
    }).then(function(result) {
      Assert.isObject(result);
      Assert.isString(result.server);
      Assert.isNumber(result.expires);

      // TODO: Send keepalive request at `result.expires`.

      console.log("[AccountFinderSession] Created '" + self._id + "'");
    });
  }

  AccountFinderSession.prototype = Object.create(Events.prototype);

  AccountFinderSession.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    return this._ready;
  }

  return AccountFinder;

});
