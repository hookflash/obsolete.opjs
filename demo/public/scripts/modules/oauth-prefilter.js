define(function() {
  'use strict';

  var services = {
    GitHub: {
      url: 'https://api.github.com/',
      varName: 'access_token'
    }
  };

  // create
  // Given a provider name and an access token, generate a jQuery AJAX
  // prefilter that will append the access token to request to that endpoint.
  var create = function(provider, token) {
    var service = services[provider];

    if (!service) {
      throw new Error('Unable to create prefilter for specified provider: "' +
        provider + '"');
    }

    return function(options) {
      // Only modify requests to the provider's domain
      if (options.url.indexOf(service.url) !== 0) {
        return;
      }

      if (options.url.indexOf('?') === -1) {
        options.url += '?';
      } else {
        options.url += '&';
      }

      options.url += service.varName + '=' + token;
    };
  };

  return {
    services: services,
    create: create
  };
});
