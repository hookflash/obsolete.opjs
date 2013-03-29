define(['modules/util'], function(util) {
  'use strict';

  suite('util', function() {
    suite('parseCookies', function() {
      var pc = util.parseCookies;

      test('the empty string', function() {
        assert.deepEqual(pc(''), {});
      });

      test('one cookie', function() {
        var cookieStr = 'lonely=1';
        var expected = { lonely: '1' };
        assert.deepEqual(pc(cookieStr), expected);
      });

      test('multiple cookies', function() {
        var cookieStr = 'one=1;two=2';
        var expected = { one: '1', two: '2' };
        assert.deepEqual(pc(cookieStr), expected);
      });

      test('value-less cookies', function() {
        var cookieStr = 'one=1;empty1=;two=2;empty2=';
        var expected = { one: '1', two: '2', empty1: '', empty2: '' };
        assert.deepEqual(pc(cookieStr), expected);
      });

      test('cookies with insignificant whitespace', function() {
        var cookieStr = 'session_id=379; client_id=2e8; access_token=d1d';
        var expected = {
          session_id: '379',
          client_id: '2e8',
          access_token: 'd1d'
        };

        assert.deepEqual(pc(cookieStr), expected);
      });
    });
  });
});
