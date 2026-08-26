/*
 * ホスト画面ロジック（デモ用）
 * 本来は既存アプリの別画面が担う「お気に入りCookieの設定」と、
 * ポップアップからの選択結果の受け取りをここで模擬する。
 */
(function ($) {
  'use strict';

  var StoreSelect = CvsStoreWidget.StoreSelect;
  var FavoriteEdit = CvsStoreWidget.FavoriteEdit;
  var FavoritesUtil = CvsStoreWidget.util.FavoritesUtil;
  var CookieUtil = CvsStoreWidget.util.CookieUtil;

  var SAMPLE_FAVORITES = [
    'セブンイレブン渋谷駅前店',
    'ローソン池袋東口店',
    'ファミリーマート横浜西口店',
    '未登録の個人経営店'
  ];

  function updateFavoriteStatus() {
    var favorites = FavoritesUtil.getNames();
    var $status = $('#favoriteCookieStatus');
    if (favorites.length === 0) {
      $status.text('お気に入りCookie: 未設定');
      return;
    }
    $status.text('お気に入りCookie: ' + favorites.length + '件登録済み');
  }

  function renderSelectedResult(store) {
    $('#resultStoreName').text(store.nm_cvs_store);
    $('#resultChainName').text(store.nm_cd_cvs_chain);
    $('#resultChainId').text(store.cd_cvs_chain);
    $('#resultLocationType').text(store.nm_cvs_location);
    $('#resultLocationTypeId').text(store.cd_cvs_location);
    $('#resultPrefecture').text(store.nm_cd_region);
    $('#resultPrefectureId').text(store.id_region);
    $('#resultStoreId').text(store.id_cvs_store ? store.id_cvs_store : '（新規店舗）');
    $('#selectedResult').show();
  }

  $(function () {
    updateFavoriteStatus();

    $('#btnSeedFavorites').on('click', function () {
      FavoritesUtil.saveNames(SAMPLE_FAVORITES);
      updateFavoriteStatus();
      alert('お気に入りサンプルをCookieにセットしました。');
    });

    $('#btnClearFavorites').on('click', function () {
      CookieUtil.remove('favoriteStores');
      updateFavoriteStatus();
    });

    $('#btnOpenStoreSelect').on('click', function () {
      StoreSelect.open();
    });

    $('#btnOpenFavoriteEdit').on('click', function () {
      FavoriteEdit.open();
    });

    $(document).on('store-selected', function (e, store) {
      renderSelectedResult(store);
    });

    $(document).on('favorites-updated', function () {
      updateFavoriteStatus();
    });
  });
})(jQuery);
