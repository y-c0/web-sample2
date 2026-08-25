/*
 * 調査対象店舗選択ポップアップ
 * window.StoreSelect.open() / close() を公開する。
 * 「決定」で登録に成功すると document に 'store-selected' カスタムイベントを発火する。
 */
var StoreSelect = (function ($) {
  'use strict';

  var $overlay, $storeNameInput, $suggestList, $selectedStoreIdInput,
    $chainSelect, $locationSelect, $prefectureSelect,
    $favoritesList, $favoritesEmptyMessage, $newStoreHint, $formErrorMessage;

  var debounceTimer = null;
  var optionsLoaded = false;

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

    $storeNameInput.on('input', handleStoreNameInput);

    $(document).on('click', function (e) {
      if (!$(e.target).closest('.autocomplete-wrapper').length) {
        hideSuggestList();
      }
    });

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
    hideSuggestList();
  }

  function resetForm() {
    $storeNameInput.val('');
    $selectedStoreIdInput.val('');
    $chainSelect.val('');
    $locationSelect.val('');
    $prefectureSelect.val('');
    $newStoreHint.hide();
    $formErrorMessage.hide().text('');
    hideSuggestList();
  }

  function loadOptionsIfNeeded(callback) {
    if (optionsLoaded) {
      callback();
      return;
    }
    $.getJSON('/api/options', function (data) {
      populateSelect($chainSelect, data.chains);
      populateSelect($locationSelect, data.locations);
      populateSelect($prefectureSelect, data.prefectures);
      optionsLoaded = true;
      callback();
    });
  }

  function populateSelect($select, items) {
    $.each(items, function (i, item) {
      $select.append($('<option></option>').val(item).text(item));
    });
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function getFavorites() {
    var raw = getCookie('favoriteStores');
    if (!raw) return [];
    try {
      var list = JSON.parse(raw);
      if (!$.isArray(list)) return [];
      return list.slice(0, 10);
    } catch (e) {
      return [];
    }
  }

  function renderFavorites() {
    var favorites = getFavorites();
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
    hideSuggestList();

    $.getJSON('/api/stores/suggest', { q: name }, function (results) {
      var exact = findExactMatch(results, name);
      if (exact) {
        applyStore(exact);
      } else {
        $selectedStoreIdInput.val('');
        $newStoreHint.show();
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
    $storeNameInput.val(store.storeName);
    $selectedStoreIdInput.val(store.id);
    $chainSelect.val(store.chainName);
    $locationSelect.val(store.locationType);
    $prefectureSelect.val(store.prefecture);
    $newStoreHint.hide();
  }

  function handleStoreNameInput() {
    // 店舗名を手入力で変更したら既存店舗との紐付けを解除する（任意店舗として扱う）
    $selectedStoreIdInput.val('');
    $newStoreHint.hide();

    var value = $.trim($storeNameInput.val());
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (!value) {
      hideSuggestList();
      return;
    }

    debounceTimer = setTimeout(function () {
      fetchSuggestions(value);
    }, 300);
  }

  function fetchSuggestions(value) {
    $.getJSON('/api/stores/suggest', { q: value }, function (results) {
      // 検索中に入力が変わっていたら結果を破棄
      if ($.trim($storeNameInput.val()) !== value) return;
      renderSuggestList(results);
    });
  }

  function renderSuggestList(results) {
    $suggestList.empty();

    if (results.length === 0) {
      $suggestList.append('<li class="suggest-empty">該当する店舗がありません（新規店舗として登録できます）</li>');
      $suggestList.show();
      return;
    }

    $.each(results, function (i, store) {
      var $item = $('<li class="suggest-item"></li>');
      $item.append($('<span class="suggest-name"></span>').text(store.storeName));
      $item.append($('<span class="suggest-meta"></span>').text(store.chainName + ' / ' + store.prefecture));
      $item.on('click', function () {
        applyStore(store);
        hideSuggestList();
      });
      $suggestList.append($item);
    });
    $suggestList.show();
  }

  function hideSuggestList() {
    $suggestList.hide().empty();
  }

  function handleConfirm() {
    var storeName = $.trim($storeNameInput.val());
    var chainName = $chainSelect.val();
    var locationType = $locationSelect.val();
    var prefecture = $prefectureSelect.val();
    var storeId = $selectedStoreIdInput.val() || null;

    if (!storeName || !chainName || !locationType || !prefecture) {
      $formErrorMessage.text('店舗名・チェーン名・立地条件・都道府県はすべて必須です。').show();
      return;
    }
    $formErrorMessage.hide();

    var payload = {
      id: storeId ? Number(storeId) : null,
      storeName: storeName,
      chainName: chainName,
      locationType: locationType,
      prefecture: prefecture
    };

    $.ajax({
      url: '/api/target-store/register',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      success: function () {
        close();
        $(document).trigger('store-selected', [payload]);
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
