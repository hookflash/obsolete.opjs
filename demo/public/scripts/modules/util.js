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

    util.deleteCookies = function(name){
        if(Array.isArray(name)) {
            for(var i = 0; i < name.length; i++){
                util.deleteCookies(name[i]);
            }
        } else if(typeof name === "string"){
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }
    };

    return util;
});
