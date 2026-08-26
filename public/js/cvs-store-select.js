/*
 * 調査対象店舗選択ポップアップ
 * window.CvsStoreWidget.StoreSelect.open() / close() を公開する。
 * 「決定」で登録に成功すると document に 'store-selected' カスタムイベントを発火する。
 */
window.CvsStoreWidget = window.CvsStoreWidget || {};

CvsStoreWidget.StoreSelect = (function ($) {
  'use strict';

  var FavoritesUtil = CvsStoreWidget.util.FavoritesUtil;
  var StoreSuggest = CvsStoreWidget.util.StoreSuggest;

  var API_ENDPOINTS = {
    SUGGEST_STORES: '/api/stores/search',
    CHAINS: '/api/cvs_chains',
    LOCATIONS: '/api/cvs_locations',
    PREFECTURES: '/api/regions',
    REGISTER_TARGET_STORE: '/api/stores'
  };

  var $overlay, $storeNameInput, $suggestList, $selectedStoreIdInput,
    $chainSelect, $locationSelect, $prefectureSelect,
    $favoritesList, $favoritesEmptyMessage, $newStoreHint, $formErrorMessage, $btnConfirm;

  var optionsLoaded = false;
  var suggestController = null;
  var appliedStore = null;

  function cacheElements() {
    $overlay = $('#storeSelectModalOverlay');
    $storeNameInput = $('#storeNameInput');
    $suggestList = $('#suggestList');
    $selectedStoreIdInput = $('#selectedStoreId');
    $chainSelect = $('#chainSelect');
    $locationSelect = $('#locationSelect');
    $prefectureSelect = $('#prefectureSelect');
    $favoritesList = $('#favoritesList');
    $favoritesEmptyMessage = $('#favoritesEmptyMessage');
    $newStoreHint = $('#newStoreHint');
    $formErrorMessage = $('#formErrorMessage');
    $btnConfirm = $('#btnConfirm');
  }

  function bindEvents() {
    $('#btnModalClose, #btnCancel').on('click', close);

    $overlay.on('click', function (e) {
      if (e.target === $overlay[0]) close();
    });

    $(document).on('keydown', function (e) {
      if (e.keyCode === 27 && $overlay.is(':visible')) close();
    });

    suggestController = StoreSuggest.attach({
      $input: $storeNameInput,
      $list: $suggestList,
      emptyMessage: '該当する店舗がありません（新規店舗として登録できます）',
      onChange: refreshNewStoreHint,
      onSelect: applyStore
    });

    $chainSelect.on('change', refreshNewStoreHint);
    $locationSelect.on('change', refreshNewStoreHint);
    $prefectureSelect.on('change', refreshNewStoreHint);

    $btnConfirm.on('click', handleConfirm);
  }

  function open() {
    resetForm();
    loadOptionsIfNeeded(function () {
      renderFavorites();
      $overlay.show();
      $storeNameInput.focus();
    });
  }

  function close() {
    $overlay.hide();
    suggestController.hide();
  }

  function resetForm() {
    $storeNameInput.val('');
    $selectedStoreIdInput.val('');
    $chainSelect.val('');
    $locationSelect.val('');
    $prefectureSelect.val('');
    appliedStore = null;
    $newStoreHint.hide();
    $formErrorMessage.hide().text('');
    $btnConfirm.prop('disabled', false);
    suggestController.hide();
  }

  function loadOptionsIfNeeded(callback) {
    if (optionsLoaded) {
      callback();
      return;
    }
    $.when(
      fetchOptionList(API_ENDPOINTS.CHAINS),
      fetchOptionList(API_ENDPOINTS.LOCATIONS),
      fetchOptionList(API_ENDPOINTS.PREFECTURES)
    ).done(function (chains, locations, prefectures) {
      // $.when に複数のDeferredを渡すと各引数は [data, textStatus, jqXHR] になる
      populateSelect($chainSelect, chains[0], 'cd_cvs_chain', 'nm_cd_cvs_chain');
      populateSelect($locationSelect, locations[0], 'cd_cvs_location', 'nm_cvs_location');
      populateSelect($prefectureSelect, prefectures[0], 'id_region', 'nm_cd_region');
      optionsLoaded = true;
      callback();
    });
  }

  function fetchOptionList(url) {
    return $.ajax({
      url: url,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({}),
      dataType: 'json'
    });
  }

  function populateSelect($select, items, idKey, nameKey) {
    $.each(items, function (i, item) {
      $select.append($('<option></option>').val(item[idKey]).text(item[nameKey]));
    });
  }

  // <select>の値（文字列 or 空文字）をID（数値）またはnullに変換する
  function toId(value) {
    return value ? Number(value) : null;
  }

  function renderFavorites() {
    var favorites = FavoritesUtil.getNames();
    $favoritesList.empty();

    if (favorites.length === 0) {
      $favoritesEmptyMessage.show();
      return;
    }
    $favoritesEmptyMessage.hide();

    $.each(favorites, function (i, name) {
      var $chip = $('<button type="button" class="favorite-chip"></button>').text(name);
      $chip.on('click', function () {
        selectFavorite(name);
      });
      $favoritesList.append($chip);
    });
  }

  function selectFavorite(name) {
    $storeNameInput.val(name);
    suggestController.hide();

    $.getJSON(API_ENDPOINTS.SUGGEST_STORES, { q: name }, function (results) {
      var exact = findExactMatch(results, name);
      if (exact) {
        applyStore(exact);
      } else {
        appliedStore = null;
        $selectedStoreIdInput.val('');
        refreshNewStoreHint();
      }
    });
  }

  function findExactMatch(results, name) {
    var found = null;
    $.each(results, function (i, store) {
      if (store.nm_cvs_store === name) {
        found = store;
        return false;
      }
    });
    return found;
  }

  function applyStore(store) {
    appliedStore = store;
    $storeNameInput.val(store.nm_cvs_store);
    $selectedStoreIdInput.val(store.id_cvs_store);
    $chainSelect.val(store.cd_cvs_chain);
    $locationSelect.val(store.cd_cvs_location);
    $prefectureSelect.val(store.id_region);
    refreshNewStoreHint();
  }

  function getCurrentValues() {
    return {
      nm_cvs_store: $.trim($storeNameInput.val()),
      cd_cvs_chain: toId($chainSelect.val()),
      nm_cd_cvs_chain: $chainSelect.find('option:selected').text(),
      cd_cvs_location: toId($locationSelect.val()),
      nm_cvs_location: $locationSelect.find('option:selected').text(),
      id_region: toId($prefectureSelect.val()),
      nm_cd_region: $prefectureSelect.find('option:selected').text()
    };
  }

  // 候補/お気に入りから適用した店舗と、フォームの現在値が完全一致するかどうか。
  // 1項目でも変更されていれば「既存ではない店舗」として新規登録扱いにする。
  // チェーン/立地条件/都道府県はコード値で比較する（名称の揺れに影響されないため）。
  function isExistingStore(values) {
    return !!appliedStore &&
      values.nm_cvs_store === appliedStore.nm_cvs_store &&
      values.cd_cvs_chain === appliedStore.cd_cvs_chain &&
      values.cd_cvs_location === appliedStore.cd_cvs_location &&
      values.id_region === appliedStore.id_region;
  }

  function refreshNewStoreHint() {
    var values = getCurrentValues();
    if (values.nm_cvs_store && !isExistingStore(values)) {
      $newStoreHint.show();
    } else {
      $newStoreHint.hide();
    }
  }

  function handleConfirm() {
    if ($btnConfirm.prop('disabled')) return;

    var values = getCurrentValues();

    if (!values.nm_cvs_store || !values.cd_cvs_chain || !values.cd_cvs_location || !values.id_region) {
      $formErrorMessage.text('店舗名・チェーン名・立地条件・都道府県はすべて必須です。').show();
      return;
    }
    $formErrorMessage.hide();

    if (isExistingStore(values)) {
      // 既存店舗：登録APIは呼ばず、店舗IDを親画面に返すのみ
      var existingPayload = $.extend({ id_cvs_store: appliedStore.id_cvs_store }, values);
      close();
      $(document).trigger('store-selected', [existingPayload]);
      return;
    }

    if (!window.confirm('新規店舗として登録しますか？')) {
      return;
    }

    // 新規店舗はIDをサーバー側で採番するため、リクエスト時点ではidを送らない
    var newPayload = $.extend({ id_cvs_store: null }, values);

    // 登録APIは非冪等（呼ぶたびに新規店舗が作られる）なので、レスポンスが返るまで
    // ボタンを無効化して連打による二重登録を防ぐ。失敗時のみ再度有効化する。
    $btnConfirm.prop('disabled', true);

    $.ajax({
      url: API_ENDPOINTS.REGISTER_TARGET_STORE,
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(newPayload),
      success: function (response) {
        newPayload.id_cvs_store = response.id_cvs_store;
        close();
        $(document).trigger('store-selected', [newPayload]);
      },
      error: function () {
        $btnConfirm.prop('disabled', false);
        $formErrorMessage.text('登録に失敗しました。時間をおいて再度お試しください。').show();
      }
    });
  }

  $(function () {
    cacheElements();
    bindEvents();
  });

  return {
    open: open,
    close: close
  };
})(jQuery);
