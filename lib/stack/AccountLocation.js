
define([
  'opjs-primitives/assert',
], function (Assert) {
  'use strict';

  /**
   * Represents our location.
   */
  function AccountLocation(options) {

    Assert.isObject(options);
    Assert.isString(options.id);
    Assert.isString(options.deviceID);
    Assert.isString(options.ip);
    Assert.isString(options.userAgent);
    Assert.isString(options.os);
    Assert.isString(options.system);
    Assert.isString(options.host);

    this._id = options.id;
    this._contact = null;
    this._deviceID = options.deviceID;
    this._ip = options.ip;
    this._userAgent = options.userAgent;
    this._os = options.os;
    this._system = options.system;
    this._host = options.host;
  }

  AccountLocation.prototype.setContact = function(contactID) {
    this._contact = contactID;
  };

  AccountLocation.prototype.getID = function() {
    return this._id;
  };

  AccountLocation.prototype.getPayload = function() {
    Assert.isString(this._contact);
    return {
      "$id": this._id,
      "contact": this._contact,
      "details": {
        "device": {
          "$id": this._deviceID
        },
        "ip": this._ip,
        "userAgent": this._userAgent,
        "os": this._os,
        "system": this._system,
        "host": this._host
      }
    };
  };

  return AccountLocation;

});
