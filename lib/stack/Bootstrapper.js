define([
  'opjs/assert',
  'opjs/Request',
  'q/q'
], function (Assert, Request, Q) {
  'use strict';

  /**
   * A Bootstrapper is the introductory server where peers first go to
   * be introduced to one (or more) Peer Finders. Peers should attempt
   * to connect to introduced Peer Finders in order to gain entry to
   * the Peer Domain. Once a Peer is connected to a Bootstrapped Network,
   * the Peer should no longer require communication back to the Bootstrapper
   * unless access to previously introduced Peer Finders are no longer
   * accessible.
   *
   * The communication to the Bootstrapper is done over HTTPS exclusively
   * whose HTTPS server certificate was signed by one of the trusted root
   * Internet certification authorities. For security purposes, the
   * Bootstrapper is the introducer to all other services within the
   * network including appropriate security credentials to connect to
   * each network component.
   *
   * The Bootstrapper is the introductory service into the domain
   * responsible for a Peer Contact and DNS is used to locate the
   * Bootstrapper.
   */
  function Bootstrapper(stack, id) {
  	var self = this;

  	self._url = urlForId(id);
  	self._services = null;

  	self._ready = self.getServices().then(function() {
  		// TODO: Check more things?
  	});

  	stack.once("destroy", function() {
  		self._ready = null;
  		self._url = null;
  		self._services = null;
  	});
  }

  Bootstrapper.prototype.ready = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._ready;
  }

  Bootstrapper.prototype.getUrl = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	return this._url;
  }

  Bootstrapper.prototype.getServices = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
  	var self = this;

  	if (self._services) return Q.resolve(self._services);

	  var url = self.getUrl();

  	return new Request({
  		dataType: "json",
  		url: url
  	}).then(function(response) {

  		// TODO: Handle redirects.
		/*
		{
		  "result": {
		    "$domain": "example.com",
		    "$handler": "bootstrapper",
		    "$method": "services-get",
		    "error": {
		      "$id": 302,
		      "#text": "Found",
		      "location": "http://someserver.com/services-get"
		    }
		  }
		}
		*/

	  	Assert(typeof response.body === "object", "`response.body` must be an object");
	  	Assert(typeof response.body.services === "object", "`response.body.services` must be an object");

		  self._services = response.body.services;

		  return self._services;
  	});
  }

  Bootstrapper.prototype.getFinders = function() {
    return this.getServices().then(function(services) {

      // TODO: Obtain finders from `services`.

      return [
        {
          wsUri: "ws://localhost:3002"
        }
      ];
    });
  }  

  return Bootstrapper;


  function domainForId(id) {

  	Assert(typeof id === "string", "`id` must be a string");

  	var domain = null;

  	// `peer://domain.com/e433a6f9793567217787e33950211453582cadff`
  	// `identity://domain.com/alice`
  	if ((domain = id.match(/^(?:peer|identity):\/\/([^\/]*)\/[^\/]*$/))) {
		domain = domain[1];
  	} else {
  		throw new Error("Invalid `id`. Cannot derive bootstrapper domain from id '" + id + "'");
  	}

  	return domain;
  }

  function urlForId(id) {

  	var domain = domainForId(id);

  	// A HTTPS request is performed on "domain.com", using the
  	// following URL: https://domain.com/.well-known/openpeer-services-get

  	var url = "https://" + domain + "/.well-known/openpeer-services-get";

  	return url;
  }

});
