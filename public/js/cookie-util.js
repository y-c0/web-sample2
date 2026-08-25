/*
 * Cookie操作の共通ユーティリティ
 */
var CookieUtil = (function () {
  'use strict';

  function get(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function set(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
  }

  function remove(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
  }

  return { get: get, set: set, remove: remove };
})();
