/*
 * お気に入り店舗の入力欄グループ（ホストのダイアログ等にマウントして使う）
 *
 * 単独のポップアップではなく、社内アプリ側の既存ダイアログの中に
 * 「お気に入り店舗名 × 最大10件」の入力欄セクションとして埋め込む前提。
 *
 * window.CvsStoreWidget.FavoriteEdit の公開API:
 *   mount(target, options) … target（省略時は [data-cvs-favorite-edit-rows]）に入力行を生成し、
 *                             各行に店舗名サジェストを付与する。DOM ready 後に1回呼ぶ。
 *                             options.count で行数を指定（既定 FavoritesUtil.MAX_COUNT）。
 *   load()               … Cookie（favoriteStores）から各入力欄を復元する。
 *                           ホストダイアログの open 時に呼ぶ。
 *   save()               … 入力値を Cookie に保存し、document に 'favorites-updated' を発火、
 *                           保存後の配列を返す。ホストダイアログの OK / beforeClose で呼ぶ。
 *   getValues()          … 現在の入力値（trim 済み・件数ぶんの配列。空文字や重複を含みうる）。
 *                           保存はしない。save() 側で重複排除・件数上限を行う。
 *   reset()              … 全行のサジェスト候補を閉じる。ホストダイアログの close で呼ぶ。
 */
window.CvsStoreWidget = window.CvsStoreWidget || {};

CvsStoreWidget.FavoriteEdit = (function ($) {
  'use strict';

  var FavoritesUtil = CvsStoreWidget.util.FavoritesUtil;
  var StoreSuggest = CvsStoreWidget.util.StoreSuggest;

  var DEFAULT_ROWS_SELECTOR = '[data-cvs-favorite-edit-rows]';

  var $container = null;
  var $inputs = [];
  var suggestControllers = [];
  // 各行の「確定済み店舗名」。手入力で値を変えるとnullに戻る。行番号でインデックスする。
  var resolvedNames = [];
  var mounted = false;

  function warnNotMounted() {
    if (window.console && console.warn) {
      console.warn('[CvsStoreWidget] FavoriteEdit.mount() が先に呼ばれていません。');
    }
  }

  function mount(target, options) {
    var $target = target ? $(target) : $(DEFAULT_ROWS_SELECTOR);
    if (!$target.length) {
      if (window.console && console.warn) {
        console.warn('[CvsStoreWidget] FavoriteEdit.mount(): マウント先が見つかりません。');
      }
      return;
    }

    $container = $target.first();
    // CSS（.cvs-store-widget 配下スコープ）を効かせるための保険。
    if (!$container.closest('.cvs-store-widget').length) {
      $container.addClass('cvs-store-widget');
    }

    var count = (options && options.count) || FavoritesUtil.MAX_COUNT;

    // 冪等: 既存の行と状態を作り直す。
    $container.empty();
    $inputs = [];
    suggestControllers = [];
    resolvedNames = [];

    for (var i = 0; i < count; i++) {
      addFavoriteRow(i);
    }
    mounted = true;
  }

  function addFavoriteRow(index) {
    var inputId = 'cvs-favorite-input-' + index;

    var $row = $('<div class="cvs-form-row cvs-favorite-edit-row"></div>');
    $row.append($('<label></label>').attr('for', inputId).text((index + 1) + '.'));

    var $wrapper = $('<div class="cvs-autocomplete-wrapper"></div>');
    var $input = $('<input type="text" autocomplete="off">')
      .attr('id', inputId)
      .attr('placeholder', '店舗名を入力してください');
    var $list = $('<ul class="cvs-suggest-list" style="display:none;"></ul>');

    $wrapper.append($input).append($list);
    $row.append($wrapper);
    $container.append($row);

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

  function load() {
    if (!mounted) { warnNotMounted(); return; }

    var favorites = FavoritesUtil.getNames();
    $.each($inputs, function (i, $input) {
      var name = favorites[i] || '';
      $input.val(name);
      // 保存済みの値は既に確定済みの店舗名として扱い、開いた直後に
      // フォーカスが当たってもサジェストが即座に出ないようにする。
      resolvedNames[i] = name || null;
    });
  }

  function getValues() {
    return $.map($inputs, function ($input) {
      return $.trim($input.val());
    });
  }

  function save() {
    if (!mounted) { warnNotMounted(); return []; }

    var names = $.map($inputs, function ($input) {
      return $input.val();
    });
    var saved = FavoritesUtil.saveNames(names);

    $(document).trigger('favorites-updated', [saved]);
    return saved;
  }

  function reset() {
    $.each(suggestControllers, function (i, controller) {
      controller.hide();
    });
  }

  return {
    mount: mount,
    load: load,
    save: save,
    getValues: getValues,
    reset: reset
  };
})(jQuery);
