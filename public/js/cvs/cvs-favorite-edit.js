/*
 * お気に入り店舗編集ポップアップ（jQuery UI dialog 版）
 * window.CvsStoreWidget.FavoriteEdit.open(arg) / close() を公開する。
 *   open() の引数（任意）: { title, width, height, dialogOptions }
 * 保存に成功すると document に 'favorites-updated' カスタムイベントを発火する。
 *
 * 表示は jQuery UI の $().dialog() を使う。フラグメントには「中身」だけを置く。
 */
window.CvsStoreWidget = window.CvsStoreWidget || {};

CvsStoreWidget.FavoriteEdit = (function ($) {
  'use strict';

  var FavoritesUtil = CvsStoreWidget.util.FavoritesUtil;
  var StoreSuggest = CvsStoreWidget.util.StoreSuggest;

  var DEFAULT_TITLE = 'お気に入り店舗を編集';

  var $dialog, $rowsContainer, $formErrorMessage;
  var $inputs = [];
  var suggestControllers = [];
  // 各行の「確定済み店舗名」。手入力で値を変えるとnullに戻る。行番号でインデックスする。
  var resolvedNames = [];
  var dialogReady = false;

  function cacheElements() {
    $dialog = $('#favoriteEditDialog');
    $rowsContainer = $('#favoriteEditRows');
    $formErrorMessage = $('#favoriteEditErrorMessage');
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
        { text: '保存', 'class': 'cvs-dialog-save', click: handleSave },
        { text: 'キャンセル', click: function () { $dialog.dialog('close'); } }
      ],
      open: function () { if ($inputs[0]) $inputs[0].focus(); },
      close: function () {
        $.each(suggestControllers, function (i, controller) { controller.hide(); });
      }
    });
    dialogReady = true;
  }

  function buildRows() {
    for (var i = 0; i < FavoritesUtil.MAX_COUNT; i++) {
      addFavoriteRow(i);
    }
  }

  function addFavoriteRow(index) {
    var $row = $('<div class="cvs-form-row cvs-favorite-edit-row"></div>');
    $row.append($('<label></label>').attr('for', 'favoriteInput' + index).text((index + 1) + '.'));

    var $wrapper = $('<div class="cvs-autocomplete-wrapper"></div>');
    var $input = $('<input type="text" autocomplete="off">')
      .attr('id', 'favoriteInput' + index)
      .attr('placeholder', '店舗名を入力してください');
    var $list = $('<ul class="cvs-suggest-list" style="display:none;"></ul>');

    $wrapper.append($input).append($list);
    $row.append($wrapper);
    $rowsContainer.append($row);

    $inputs.push($input);
    resolvedNames[index] = null;

    // 候補から選び終えた直後は resolvedNames[index] に確定名を覚えておき、
    // フォーカスバックでのサジェスト再表示をスキップする（手入力で値を変えたらリセット）。
    suggestControllers.push(StoreSuggest.attach({
      $input: $input,
      $list: $list,
      onChange: function () {
        resolvedNames[index] = null;
      },
      onSelect: function (store) {
        $input.val(store.nm_cvs_store);
        resolvedNames[index] = store.nm_cvs_store;
      },
      isResolved: function () {
        return resolvedNames[index] !== null && $.trim($input.val()) === resolvedNames[index];
      }
    }));
  }

  function toOpenOptions(arg) {
    if (arg == null) return {};
    if (typeof arg === 'object') return arg;
    return {};
  }

  function applyDialogOptions(opts) {
    if (opts.title != null) $dialog.dialog('option', 'title', opts.title);
    if (opts.width != null) $dialog.dialog('option', 'width', opts.width);
    if (opts.height != null) $dialog.dialog('option', 'height', opts.height);
    if (opts.dialogOptions) $dialog.dialog('option', opts.dialogOptions);
  }

  function open(arg) {
    resetForm();
    applyDialogOptions(toOpenOptions(arg));

    var favorites = FavoritesUtil.getNames();
    $.each($inputs, function (i, $input) {
      var name = favorites[i] || '';
      $input.val(name);
      // 保存済みの値は既に確定済みの店舗名として扱い、開いた直後に
      // フォーカスが当たってもサジェストが即座に出ないようにする。
      resolvedNames[i] = name || null;
    });

    $dialog.dialog('open');
  }

  function close() {
    if (dialogReady) $dialog.dialog('close');
  }

  function resetForm() {
    $formErrorMessage.hide().text('');
  }

  function handleSave() {
    var names = $.map($inputs, function ($input) {
      return $input.val();
    });
    var saved = FavoritesUtil.saveNames(names);

    close();
    $(document).trigger('favorites-updated', [saved]);
  }

  $(function () {
    cacheElements();
    // この画面にお気に入り編集ダイアログが無ければ何もしない（部分埋め込み対応）。
    if (!$dialog.length) return;
    if (typeof $.fn.dialog !== 'function') {
      if (window.console && console.error) {
        console.error('[CvsStoreWidget] jQuery UI の dialog が見つかりません。jquery-ui を読み込んでください。');
      }
      return;
    }
    buildRows();
    initDialog();
  });

  return {
    open: open,
    close: close
  };
})(jQuery);
