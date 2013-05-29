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

    util.diff = function(original, arr, fnCompare, key) {
        if (!(original instanceof Array)) original = [original];
        if (!(arr instanceof Array)) arr = [arr];

        var exists, result = { changed: [], removed: [], inserted: [] };

        original.forEach(function(existingItem) {
            exists = arr.some(function(newItem) {
                return fnCompare(existingItem, newItem);
            });

            if(!exists) result.removed.push(existingItem);
        });

        arr.forEach(function(newItem) {
            exists = original.some(function(existingItem) {
                return fnCompare(existingItem, newItem);
            });

            if (!exists) result.inserted.push(newItem);
        });

        result.inserted.forEach(function(changedItem){
            var rmItem;
            var changed = result.removed.some(function(removedItem){
                if(removedItem[key] === changedItem[key]) rmItem = removedItem;
                return removedItem[key] === changedItem[key];
            });

            if(changed && rmItem){
                result.changed.push(changedItem);
                result.removed.splice(result.removed.indexOf(rmItem), 1);
                result.inserted.splice(result.inserted.indexOf(changedItem), 1);
            }
        });

        return result;
    };

    return util;
});
