define([
  'opjs/assert',
  'opjs/request',
  'opjs/util',
  'q/q'
], function (Assert, Request, Util, Q) {
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
  function Bootstrapper(context, account, id) {
  	var self = this;

    (self._context = context).injectLogger(self);

  	self._url = urlForId(id);
  	self._services = null;
    self._finders = null;
    self._certificates = null;

  	self._ready = self.getServices();

  	account.once("destroy", function() {
  		self._ready = null;
  		self._url = null;
  		self._services = null;
      self._finders = null;
      self._certificates = null;
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

    // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#BootstrapperServiceRequests-ServicesGetRequest

    return Request.makeRequestTo(self._context, url, "bootstrapper", "services-get").then(function(result) {

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

      Assert.equal(typeof result, "object");
      Assert.equal(typeof result.services, "object");
      Assert.equal(Array.isArray(result.services.service), true);

		  self._services = result.services.service;

		  return self._services;
  	});
  }

  Bootstrapper.prototype.getFinders = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    var self = this;

    if (self._finders) return Q.resolve(self._finders);

    return this.getServices().then(function(services) {

      var url = null;
      services.forEach(function(service) {
        if (
          service.type === "bootstrapped-finders" &&
          service.methods.method.name === "finders-get"
        ) {
          url = service.methods.method.uri;
        }
      });
      Assert.equal(typeof url, "string");

      // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#BootstrappedFinderServiceRequests-FindersGetRequest
      return Request.makeRequestTo(self._context, url, "bootstrapper-finder", "finders-get", {
        "servers": 2
      }).then(function(result) {

        Assert.equal(typeof result.finders, "object");
        Assert.notEqual(typeof result.finders.finderBundle, "undefined");
        var finderBundle = result.finders.finderBundle;
        if (!Array.isArray(finderBundle)) {
          finderBundle = [
            finderBundle
          ];
        }
        Assert.equal(finderBundle.length > 0, true);

        var finders = [];
        finderBundle.forEach(function(bundle) {
          Assert.equal(typeof bundle.finder, "object");
          finders.push(bundle.finder);

          // TODO: Verify `bundle.signature`.
        });

        self._finders = finders;

        return self._finders;
      });
    });
  }

  Bootstrapper.prototype.getCertificates = function() {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    var self = this;

    if (self._certificates) return Q.resolve(self._certificates);

    return this.getServices().then(function(services) {

      var url = null;
      services.forEach(function(service) {
        if (
          service.type === "certificates" &&
          service.methods.method.name === "certificates-get"
        ) {
          url = service.methods.method.uri;
        }
      });
      Assert.equal(typeof url, "string");

      // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#CertificatesServiceRequests-CertificatesGetRequest
      return Request.makeRequestTo(self._context, url, "certificates", "certificates-get").then(function(result) {

        Assert.equal(typeof result.certificates, "object");
        Assert.equal(Array.isArray(result.certificates.certificateBundle), true);
        Assert.equal(result.certificates.certificateBundle.length > 0, true);

        var certificates = [];
        result.certificates.certificateBundle.forEach(function(bundle) {
          Assert.equal(typeof bundle.certificate, "object");
          certificates.push(bundle.certificate);

          // TODO: Verify `bundle.signature`.
        });

        self._certificates = certificates;

        return self._certificates;
      });
    });
  }

  Bootstrapper.prototype.getSalts = function(number) {
    if (this._ready === null) return Q.reject(new Error("Object has been destroyed"));
    var self = this;

    return this.getServices().then(function(services) {

      var url = null;
      services.forEach(function(service) {
        if (
          service.type === "salt" &&
          service.methods.method.name === "signed-salt-get"
        ) {
          url = service.methods.method.uri;
        }
      });
      Assert.equal(typeof url, "string");

      // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#PeerSaltServiceProtocol-SignedSaltGetRequest
      return Request.makeRequestTo(self._context, url, "peer-salt", "signed-salt-get", {
        "salts": number || 1
      }).then(function(result) {

        Assert.equal(typeof result.salts, "object");
        Assert.notEqual(typeof result.salts.saltBundle, "undefined");
        var saltBundle = result.salts.saltBundle;
        if (!Array.isArray(saltBundle)) {
          saltBundle = [
            saltBundle
          ];
        }
        Assert.equal(saltBundle.length > 0, true);

        var salts = [];
        saltBundle.forEach(function(bundle) {
          Assert.equal(typeof bundle.salt, "object");
          salts.push(bundle.salt);

          // TODO: Verify `bundle.signature`.
        });

        return salts;
      });
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

  // @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#BootstrapperServiceRequests-LocatingTheBootstrapper
  function urlForId(id) {

  	var domain = domainForId(id);

    // HACK: Development.
    if (domain === "localhost") {
      domain = Util.getHost();
    }

  	// A HTTPS request is performed on "domain.com", using the
  	// following URL: https://domain.com/.well-known/openpeer-services-get

  	var url = "https://" + domain + "/.well-known/openpeer-services-get";

  	return url;
  }

});
