/*
 * 調査対象店舗選択ポップアップ
 * window.StoreSelect.open() / close() を公開する。
 * 「決定」で登録に成功すると document に 'store-selected' カスタムイベントを発火する。
 */
var StoreSelect = (function ($) {
  'use strict';

  var API_ENDPOINTS = {
    SUGGEST_STORES: '/api/stores/suggest',
    CHAINS: '/api/chains',
    LOCATIONS: '/api/locations',
    PREFECTURES: '/api/prefectures',
    REGISTER_TARGET_STORE: '/api/target-store/register'
  };

  var $overlay, $storeNameInput, $suggestList, $selectedStoreIdInput,
    $chainSelect, $locationSelect, $prefectureSelect,
    $favoritesList, $favoritesEmptyMessage, $newStoreHint, $formErrorMessage;

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

    $('#btnConfirm').on('click', handleConfirm);
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
      populateSelect($chainSelect, chains[0]);
      populateSelect($locationSelect, locations[0]);
      populateSelect($prefectureSelect, prefectures[0]);
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

  function populateSelect($select, items) {
    $.each(items, function (i, item) {
      $select.append($('<option></option>').val(item).text(item));
    });
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
      if (store.storeName === name) {
        found = store;
        return false;
      }
    });
    return found;
  }

  function applyStore(store) {
    appliedStore = store;
    $storeNameInput.val(store.storeName);
    $selectedStoreIdInput.val(store.id);
    $chainSelect.val(store.chainName);
    $locationSelect.val(store.locationType);
    $prefectureSelect.val(store.prefecture);
    refreshNewStoreHint();
  }

  function getCurrentValues() {
    return {
      storeName: $.trim($storeNameInput.val()),
      chainName: $chainSelect.val(),
      locationType: $locationSelect.val(),
      prefecture: $prefectureSelect.val()
    };
  }

  // 候補/お気に入りから適用した店舗と、フォームの現在値が完全一致するかどうか。
  // 1項目でも変更されていれば「既存ではない店舗」として新規登録扱いにする。
  function isExistingStore(values) {
    return !!appliedStore &&
      values.storeName === appliedStore.storeName &&
      values.chainName === appliedStore.chainName &&
      values.locationType === appliedStore.locationType &&
      values.prefecture === appliedStore.prefecture;
  }

  function refreshNewStoreHint() {
    var values = getCurrentValues();
    if (values.storeName && !isExistingStore(values)) {
      $newStoreHint.show();
    } else {
      $newStoreHint.hide();
    }
  }

  function handleConfirm() {
    var values = getCurrentValues();

    if (!values.storeName || !values.chainName || !values.locationType || !values.prefecture) {
      $formErrorMessage.text('店舗名・チェーン名・立地条件・都道府県はすべて必須です。').show();
      return;
    }
    $formErrorMessage.hide();

    if (isExistingStore(values)) {
      // 既存店舗：登録APIは呼ばず、店舗IDを親画面に返すのみ
      var existingPayload = $.extend({ id: appliedStore.id }, values);
      close();
      $(document).trigger('store-selected', [existingPayload]);
      return;
    }

    if (!window.confirm('新規店舗として登録しますか？')) {
      return;
    }

    var newPayload = $.extend({ id: null }, values);

    $.ajax({
      url: API_ENDPOINTS.REGISTER_TARGET_STORE,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(newPayload),
      success: function () {
        close();
        $(document).trigger('store-selected', [newPayload]);
      },
      error: function () {
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
