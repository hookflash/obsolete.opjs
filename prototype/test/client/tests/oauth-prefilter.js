define(['modules/oauth-prefilter'], function(oauthPrefilter) {
  'use strict';

  suite('OAuth Prefilter', function() {

    suite('GitHub.com requests', function() {

      test('Requests to other domains pass through', function() {
        var request = {};

        request.url = 'https://hookflash.com';
        oauthPrefilter(request);
        assert.equal(request.url, 'https://hookflash.com');

        request.url = 'http://api.github.com';
        oauthPrefilter(request);
        assert.equal(request.url, 'http://api.github.com');
      });

      test('Requests to the correct domain are correctly modified', function() {
        var request = {};
        var token = document.cookie.match(/client_id=([^;]+)/);
        token = token && token[1];

        request.url = 'https://api.github.com/something';
        oauthPrefilter(request);
        assert.equal(request.url,
          'https://api.github.com/something?access_token=' + token);

        request.url = 'https://api.github.com/something?query';
        oauthPrefilter(request);
        assert.equal(request.url,
          'https://api.github.com/something?query&access_token=' + token);
      });
    });
  });
});
