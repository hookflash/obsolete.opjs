define(['jquery', '_'], function($, _) {
  'use strict';

  var services = [
    {
      url: 'https://api.github.com/',
      varName: 'access_token',
      getToken: function() {
        // TODO: Do not rely on global scope.
        return window.access_token || null;
        //var match = document.cookie.match(/client_id=([a-f0-9]+)/i);
        //return match && match[1];
      }
    }
  ];

  return function(options) {
    var service = _.find(services, function(service) {
      return options.url.indexOf(service.url) === 0;
    });
    if (!service) {
      return;
    }

    if (options.url.indexOf('?') === -1) {
      options.url += '?';
    } else {
      options.url += '&';
    }

    options.url += service.varName + '=' + service.getToken();
  };
});
