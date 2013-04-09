define(function() {
  'use strict';

  var util = {};

  // parseCookies
  // Given a cookie string, return an object literal whose keys are the cookie
  // names and values are the cookie values.
  util.parseCookies = function(cookieStr) {
    var cookieObj = {};
    var cookies = cookieStr.split(';');
    cookies.forEach(function(cookie) {
      cookie = cookie.split('=');
      cookie[0] = cookie[0].replace(/^\s+/, '');
      if (cookie[0]) {
        cookieObj[cookie[0]] = cookie[1];
      }
    });
    return cookieObj;
  };

  return util;
});
