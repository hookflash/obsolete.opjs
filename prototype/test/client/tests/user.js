define(['modules/user'], function(User) {
  'use strict';

  suite('User', function() {
    suite('#validate', function() {
      var user;
      suiteSetup(function() {
        user = new User();
      });
      test('Rejects unspecified string names', function() {
        assert.instanceOf(user.validate(), Error);
        assert.instanceOf(user.validate({ name: '' }), Error);
      });
      test('Rejects invalid names', function() {
        assert.instanceOf(user.validate({ name: '!@#@#$' }), Error);
      });
    });
  });
});
