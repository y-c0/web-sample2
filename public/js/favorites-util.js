/*
 * お気に入り店舗名Cookie（favoriteStores）の読み書き共通処理
 * 値は店舗名のJSON配列。最大10件。
 */
var FavoritesUtil = (function () {
  'use strict';

  var COOKIE_NAME = 'favoriteStores';
  var MAX_COUNT = 10;
  var EXPIRES_DAYS = 30;

  function getNames() {
    var raw = CookieUtil.get(COOKIE_NAME);
    if (!raw) return [];
    try {
      var list = JSON.parse(raw);
      if (!$.isArray(list)) return [];
      return list.slice(0, MAX_COUNT);
    } catch (e) {
      return [];
    }
  }

  function saveNames(names) {
    var trimmed = trimAndDedupe(names).slice(0, MAX_COUNT);
    CookieUtil.set(COOKIE_NAME, JSON.stringify(trimmed), EXPIRES_DAYS);
    return trimmed;
  }

  function trimAndDedupe(names) {
    var seen = {};
    var result = [];
    $.each(names, function (i, name) {
      var trimmedName = $.trim(name || '');
      if (!trimmedName || seen[trimmedName]) return;
      seen[trimmedName] = true;
      result.push(trimmedName);
    });
    return result;
  }

  return {
    MAX_COUNT: MAX_COUNT,
    getNames: getNames,
    saveNames: saveNames
  };
})();
