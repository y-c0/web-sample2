/*
 * 調査対象店舗選択ポップアップ（jQuery UI dialog 版）
 *
 * window.CvsStoreWidget.StoreSelect.open(arg) / close() を公開する。
 *   open() の引数:
 *     - 文字列/数値      … 関連ファイルのID or ファイル名（新規店舗登録リクエストに乗せる）
 *     - オブジェクト      … { file, storeId, title, width, height, dialogOptions }
 *                           title / width / height / 任意の dialog オプションをその場で上書きできる。
 *                           storeId（別名 id_cvs_store）を渡すと、その店舗を選択済みの状態で開く
 *                           （前回 store-selected で受け取った payload をそのまま渡してもよい）。
 * 「OK」で登録に成功すると document に 'store-selected' カスタムイベントを発火する。
 *
 * 表示は jQuery UI の $().dialog() を使う（タイトルバー・OK/キャンセル・暗幕は jQuery UI が生成）。
 * フラグメントには「中身」だけを置く。jquery-ui（dialog を含む）を先に読み込むこと。
 */
window.CvsStoreWidget = window.CvsStoreWidget || {};

CvsStoreWidget.StoreSelect = (function ($) {
  'use strict';

  var FavoritesUtil = CvsStoreWidget.util.FavoritesUtil;
  var StoreSuggest = CvsStoreWidget.util.StoreSuggest;

  // APIパスとURL組み立ては cvs-api-config.js に集約（コンテキストパス対応のため）。
  var PATHS = CvsStoreWidget.config.paths;
  var apiUrl = CvsStoreWidget.util.apiUrl;

  var DEFAULT_TITLE = '店舗選択';

  var $dialog, $storeNameInput, $suggestList, $selectedStoreIdInput,
    $chainSelect, $locationSelect, $prefectureSelect,
    $favoritesList, $favoritesEmptyMessage, $newStoreHint, $formErrorMessage;

  var optionsLoaded = false;
  var suggestController = null;
  var appliedStore = null;
  var currentFile = null;
  var dialogReady = false;
  var submitting = false;

  function cacheElements() {
    $dialog = $('#storeSelectDialog');
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

  function initDialog() {
    $dialog.dialog({
      autoOpen: false,
      modal: true,
      width: 480,
      appendTo: 'body',
      closeText: '閉じる',
      title: $dialog.attr('title') || DEFAULT_TITLE,
      buttons: [
        { text: 'OK', 'class': 'cvs-dialog-confirm', click: handleConfirm },
        { text: 'キャンセル', click: function () { $dialog.dialog('close'); } }
      ],
      open: function () { $storeNameInput.focus(); },
      close: function () { if (suggestController) suggestController.hide(); }
    });
    dialogReady = true;
  }

  function bindEvents() {
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
  }

  // open() の引数を { file, title, width, height, dialogOptions } に正規化する。
  function toOpenOptions(arg) {
    if (arg == null) return {};
    if (typeof arg === 'object') return arg;
    return { file: arg };
  }

  function applyDialogOptions(opts) {
    if (opts.title != null) $dialog.dialog('option', 'title', opts.title);
    if (opts.width != null) $dialog.dialog('option', 'width', opts.width);
    if (opts.height != null) $dialog.dialog('option', 'height', opts.height);
    if (opts.dialogOptions) $dialog.dialog('option', opts.dialogOptions);
  }

  function open(arg) {
    var opts = toOpenOptions(arg);
    resetForm();
    currentFile = opts.file || null;
    var storeId = (opts.storeId != null) ? opts.storeId : opts.id_cvs_store;
    applyDialogOptions(opts);
    loadOptionsIfNeeded(function () {
      renderFavorites();
      if (storeId != null && storeId !== '') {
        preselectById(storeId, function () { $dialog.dialog('open'); });
      } else {
        $dialog.dialog('open');
      }
    });
  }

  // 店舗IDで1件取得し、見つかれば applyStore（＝サジェスト候補から選んだのと同じ確定状態）にする。
  // 見つからない/失敗しても done() は呼び、ダイアログは開く（その場合は空のまま・console.warn）。
  function preselectById(storeId, done) {
    $.getJSON(apiUrl(PATHS.SUGGEST_STORES), { id: storeId })
      .done(function (results) {
        var store = (results && results.length) ? results[0] : null;
        if (store) {
          applyStore(store);
        } else if (window.console && console.warn) {
          console.warn('[CvsStoreWidget] StoreSelect: 店舗ID ' + storeId + ' が見つかりませんでした。');
        }
      })
      .fail(function () {
        if (window.console && console.warn) {
          console.warn('[CvsStoreWidget] StoreSelect: 店舗ID取得に失敗しました。');
        }
      })
      .always(function () { done(); });
  }

  function close() {
    if (dialogReady) $dialog.dialog('close');
  }

  function setConfirmEnabled(enabled) {
    if (!dialogReady) return;
    $dialog.dialog('widget').find('.cvs-dialog-confirm')
      .prop('disabled', !enabled)
      .toggleClass('ui-state-disabled', !enabled);
  }

  function resetForm() {
    $storeNameInput.val('');
    $selectedStoreIdInput.val('');
    $chainSelect.val('');
    $locationSelect.val('');
    $prefectureSelect.val('');
    appliedStore = null;
    submitting = false;
    setConfirmEnabled(true);
    $newStoreHint.hide();
    $formErrorMessage.hide().text('');
    if (suggestController) suggestController.hide();
  }

  function loadOptionsIfNeeded(callback) {
    if (optionsLoaded) {
      callback();
      return;
    }
    $.when(
      fetchOptionList(apiUrl(PATHS.CHAINS)),
      fetchOptionList(apiUrl(PATHS.LOCATIONS)),
      fetchOptionList(apiUrl(PATHS.PREFECTURES))
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
      var $chip = $('<button type="button" class="cvs-favorite-chip"></button>').text(name);
      $chip.on('click', function () {
        selectFavorite(name);
      });
      $favoritesList.append($chip);
    });
  }

  function selectFavorite(name) {
    $storeNameInput.val(name);
    suggestController.hide();

    $.getJSON(apiUrl(PATHS.SUGGEST_STORES), { q: name }, function (results) {
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
    if (submitting) return;

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
    // 送信中フラグ＋OKボタン無効化で連打による二重登録を防ぐ。失敗時のみ解除する。
    submitting = true;
    setConfirmEnabled(false);

    $.ajax({
      url: apiUrl(PATHS.REGISTER_TARGET_STORE),
      type: 'PUT',
      contentType: 'application/json',
      data: JSON.stringify(newPayload),
      success: function (response) {
        // サーバーが確定登録した店舗データ（採番済みIDを含む）は response.records に入る。
        // フォームの現在値をベースに、サーバー返却値で上書きする。
        var record = (response && response.records) || {};
        var registeredPayload = $.extend({ file: currentFile }, values, record);
        submitting = false;
        close();
        $(document).trigger('store-selected', [registeredPayload]);
      },
      error: function () {
        submitting = false;
        setConfirmEnabled(true);
        $formErrorMessage.text('登録に失敗しました。時間をおいて再度お試しください。').show();
      }
    });
  }

  $(function () {
    cacheElements();
    // この画面に店舗選択ダイアログが無ければ何もしない（部分埋め込み対応）。
    if (!$dialog.length) return;
    if (typeof $.fn.dialog !== 'function') {
      if (window.console && console.error) {
        console.error('[CvsStoreWidget] jQuery UI の dialog が見つかりません。jquery-ui を読み込んでください。');
      }
      return;
    }
    bindEvents();
    initDialog();
  });

  return {
    open: open,
    close: close
  };
})(jQuery);
