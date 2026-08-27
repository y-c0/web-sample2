/*
 * 調査対象店舗選択ポップアップ
 * window.CvsStoreWidget.StoreSelect.open(file) / close() を公開する。
 * file はホスト画面から受け取る関連ファイルのIDまたはファイル名（任意）で、
 * 新規店舗登録時のリクエストにそのまま乗せる。
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
  var currentFile = null;

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
      onSelect: applyStore,
      // 店舗名欄の今の値が、確定済みの appliedStore とそのまま一致しているか。
      // 一致していれば「選び終えた状態」とみなし、フォーカスバックでの
      // サジェスト再表示をスキップする。
      isResolved: function () {
        return !!appliedStore && $.trim($storeNameInput.val()) === appliedStore.nm_cvs_store;
      }
    });

    $chainSelect.on('change', refreshNewStoreHint);
    $locationSelect.on('change', refreshNewStoreHint);
    $prefectureSelect.on('change', refreshNewStoreHint);

    $btnConfirm.on('click', handleConfirm);
  }

  function open(file) {
    resetForm();
    currentFile = file || null;
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
      // レスポンスは { records: [...] } 形式で返る
      populateSelect($chainSelect, chains[0].records, 'cd_cvs_chain', 'nm_cvs_chain');
      populateSelect($locationSelect, locations[0].records, 'cd_cvs_location', 'nm_cvs_location');
      populateSelect($prefectureSelect, prefectures[0].records, 'cd_region', 'nm_region');
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

  // <select>の値（文字列 or 空文字）を、未選択なら null に正規化する。
  // チェーン/立地条件/都道府県のコードは文字列型なので数値変換はしない。
  function toCode(value) {
    return value ? value : null;
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
      var matches = findExactMatches(results, name);

      if (matches.length === 1) {
        applyStore(matches[0]);
        return;
      }

      appliedStore = null;
      $selectedStoreIdInput.val('');

      if (matches.length > 1) {
        // 店舗名にチェーン名を含めないため、別チェーンに同名店舗が存在すると
        // ここで複数件ヒットしうる。既存のサジェスト候補リストを再利用して
        // どの店舗か選び直してもらう（クリック時の処理は通常の候補選択と同じ applyStore）。
        suggestController.showResults(matches);
      }
      refreshNewStoreHint();
    });
  }

  function findExactMatches(results, name) {
    return $.grep(results, function (store) {
      return store.nm_cvs_store === name;
    });
  }

  function applyStore(store) {
    appliedStore = store;
    $storeNameInput.val(store.nm_cvs_store);
    $selectedStoreIdInput.val(store.id_cvs_store);
    $chainSelect.val(store.cd_cvs_chain);
    $locationSelect.val(store.cd_cvs_location);
    $prefectureSelect.val(store.cd_region);
    refreshNewStoreHint();
  }

  function getCurrentValues() {
    return {
      nm_cvs_store: $.trim($storeNameInput.val()),
      cd_cvs_chain: toCode($chainSelect.val()),
      nm_cvs_chain: $chainSelect.find('option:selected').text(),
      cd_cvs_location: toCode($locationSelect.val()),
      nm_cvs_location: $locationSelect.find('option:selected').text(),
      cd_region: toCode($prefectureSelect.val()),
      nm_region: $prefectureSelect.find('option:selected').text()
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
      values.cd_region === appliedStore.cd_region;
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

    if (!values.nm_cvs_store || !values.cd_cvs_chain || !values.cd_cvs_location || !values.cd_region) {
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
    var newPayload = $.extend({ id_cvs_store: null, file: currentFile }, values);

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
