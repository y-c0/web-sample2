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

  // 店舗名にチェーン名を含めない前提のため、名称のみで登録する。
  // 「渋谷駅前店」はセブンイレブン・ローソンの2チェーンに同名店舗が存在する
  // ため、お気に入り選択時に複数候補のサジェストが出ることを確認できる。
  var SAMPLE_FAVORITES = [
    '渋谷駅前店',
    '池袋東口店',
    '横浜西口店',
    '未登録の個人経営店'
  ];

  // 実アプリでは調査結果登録画面等からこのURLに ?file=... が付与されて遷移してくる想定。
  // アップロード自体は別画面/別処理が担い、ここでは関連ファイルのIDまたはファイル名を
  // 受け取って店舗登録リクエストに乗せるだけ。
  function getQueryParam(name) {
    var match = location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  var fileParam = getQueryParam('file');

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
    $('#resultChainName').text(store.nm_cvs_chain);
    $('#resultChainId').text(store.cd_cvs_chain);
    $('#resultLocationType').text(store.nm_cvs_location);
    $('#resultLocationTypeId').text(store.cd_cvs_location);
    $('#resultPrefecture').text(store.nm_region);
    $('#resultPrefectureId').text(store.cd_region);
    $('#resultStoreId').text(store.id_cvs_store ? store.id_cvs_store : '（新規店舗）');
    $('#resultFile').text(store.file ? store.file : '（なし）');
    $('#selectedResult').show();
  }

  $(function () {
    updateFavoriteStatus();
    $('#fileParamStatus').text(fileParam ? fileParam : '未指定');

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
      StoreSelect.open(fileParam);
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
