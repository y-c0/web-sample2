/*
 * ホスト画面ロジック（デモ用）
 * 本来は既存アプリの別画面が担う「お気に入りCookieの設定」と、
 * ポップアップからの選択結果の受け取りをここで模擬する。
 */
(function ($) {
  'use strict';

  var FAVORITE_COOKIE = 'favoriteStores';
  var SAMPLE_FAVORITES = [
    'セブンイレブン渋谷駅前店',
    'ローソン池袋東口店',
    'ファミリーマート横浜西口店',
    '未登録の個人経営店'
  ];

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
  }

  function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function updateFavoriteStatus() {
    var raw = getCookie(FAVORITE_COOKIE);
    var $status = $('#favoriteCookieStatus');
    if (!raw) {
      $status.text('お気に入りCookie: 未設定');
      return;
    }
    try {
      var list = JSON.parse(raw);
      $status.text('お気に入りCookie: ' + list.length + '件登録済み');
    } catch (e) {
      $status.text('お気に入りCookie: 不正な形式');
    }
  }

  function renderSelectedResult(store) {
    $('#resultStoreName').text(store.storeName);
    $('#resultChainName').text(store.chainName);
    $('#resultLocationType').text(store.locationType);
    $('#resultPrefecture').text(store.prefecture);
    $('#resultStoreId').text(store.id ? store.id : '（新規店舗）');
    $('#selectedResult').show();
  }

  $(function () {
    updateFavoriteStatus();

    $('#btnSeedFavorites').on('click', function () {
      setCookie(FAVORITE_COOKIE, JSON.stringify(SAMPLE_FAVORITES), 7);
      updateFavoriteStatus();
      alert('お気に入りサンプルをCookieにセットしました。');
    });

    $('#btnClearFavorites').on('click', function () {
      deleteCookie(FAVORITE_COOKIE);
      updateFavoriteStatus();
    });

    $('#btnOpenStoreSelect').on('click', function () {
      StoreSelect.open();
    });

    $(document).on('store-selected', function (e, store) {
      renderSelectedResult(store);
    });
  });
})(jQuery);
