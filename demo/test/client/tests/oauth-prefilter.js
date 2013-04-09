define(['modules/oauth-prefilter'], function(OauthPrefilter) {
  'use strict';

  suite('OAuth Prefilter', function() {

    suite('create', function() {
      test('Throws an error when an unrecognized domain is specified', function() {
        var nogood = function() {
          OauthPrefilter.create('this is a made up provider');
        };
        assert.throws(nogood);
      });
    });

    suite('Service provider specific requests', function() {

      suite('GitHub.com', function() {

        suiteSetup(function() {
          this.prefilter = OauthPrefilter.create('GitHub', 'deadbeef');
        });

        test('Requests to other domains pass through', function() {
          var request = {};

          request.url = 'https://hookflash.com';
          this.prefilter(request);
          assert.equal(request.url, 'https://hookflash.com');

          request.url = 'http://api.github.com';
          this.prefilter(request);
          assert.equal(request.url, 'http://api.github.com');
        });

        test('Requests to the correct domain are correctly modified', function() {
          var request = {};

          request.url = 'https://api.github.com/something';
          this.prefilter(request);
          assert.equal(request.url,
            'https://api.github.com/something?access_token=deadbeef');

          request.url = 'https://api.github.com/something?query';
          this.prefilter(request);
          assert.equal(request.url,
            'https://api.github.com/something?query&access_token=deadbeef');
        });
      });
    });
  });
});
