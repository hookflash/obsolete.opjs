
define([
  'opjs/ws',
  'q/q',
  'opjs/events',
  'opjs/assert'
], function (WS, Q, Events, Assert) {

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

  	account.once("destroy", function() {
  		self._ready = null;
      if (self._connection) {
        self._connection.close();
      }
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

        Assert.equal(typeof finder, "object");
        Assert.equal(typeof finder.finder, "object");
        Assert.equal(typeof finder.finder.wsUri, "string");

        var wsUri = finder.finder.wsUri;
        done = Q.when(done, function() {
          // We are connected so we can skip the remainder.
          if (self._connection) return;
          // Try to connect to finder.
          return connectToFinder(wsUri).then(function(connection) {
            if (connection) {
              self._connectionIndex += 1;
              self._connection = connection;
              console.log("[AccountFinder] Connection to '" + wsUri + "' success!");
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

  return AccountFinder;

});
