/*
 * 店舗名サジェスト（Ajax, /api/stores/search）を任意のテキスト入力欄に付与する共通部品。
 * 店舗選択ポップアップ・お気に入り編集ポップアップの双方から利用する。
 * window.CvsStoreWidget.util.StoreSuggest として公開する。
 */
window.CvsStoreWidget = window.CvsStoreWidget || {};
window.CvsStoreWidget.util = window.CvsStoreWidget.util || {};

CvsStoreWidget.util.StoreSuggest = (function ($) {
  'use strict';

  // APIパスとURL組み立ては cvs-api-config.js に集約（コンテキストパス対応のため）。
  var apiUrl = CvsStoreWidget.util.apiUrl;
  var PATHS = CvsStoreWidget.config.paths;

  var DEBOUNCE_MS = 300;

  /**
   * @param {Object} options
   * @param {jQuery} options.$input     対象のテキスト入力欄
   * @param {jQuery} options.$list      候補を表示する<ul>
   * @param {Function} options.onSelect 候補クリック時に呼ばれる function(store)
   * @param {Function} [options.onChange] 入力値が変わるたびに呼ばれる function()
   */
  function attach(options) {
    var $input = options.$input;
    var $list = options.$list;
    var debounceTimer = null;
    var isComposing = false;

    // IME変換中（かな漢字変換の未確定文字列）はサジェスト検索を走らせない。
    // 変換中にinputイベントごとに検索すると、変換途中の文字列でAPIを叩いてしまい
    // 候補がちらついたり無駄なリクエストが発生するため、確定（compositionend）まで待つ。
    $input.on('compositionstart', function () {
      isComposing = true;
    });

    $input.on('compositionend', function () {
      isComposing = false;
      triggerSearch();
    });

    $input.on('input', function (e) {
      if (typeof options.onChange === 'function') {
        options.onChange();
      }

      if (isComposing || (e.originalEvent && e.originalEvent.isComposing)) {
        return;
      }

      triggerSearch();
    });

    // フォーカスを外して戻ってきたときも、既に入力済みの値でサジェストを
    // 再表示する（クリックして他候補を見比べ直せるように）。値が変わったわけ
    // ではないのでデバウンスはせず、その場で検索する。
    // ただし、呼び出し側が isResolved() を渡していて「今の値は確定済みの選択と
    // 一致している」と判定した場合は再表示しない（選び終えた直後に毎回出ると
    // 煩わしいため）。
    $input.on('focus', function () {
      var value = $.trim($input.val());
      if (!value) return;

      if (typeof options.isResolved === 'function' && options.isResolved()) {
        return;
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      fetchSuggestions(value);
    });

    function triggerSearch() {
      var value = $.trim($input.val());
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      if (!value) {
        hide();
        return;
      }

      debounceTimer = setTimeout(function () {
        fetchSuggestions(value);
      }, DEBOUNCE_MS);
    }

    $(document).on('click', function (e) {
      if (!$(e.target).closest($input.parent()).length) {
        hide();
      }
    });

    function fetchSuggestions(value) {
      $.getJSON(apiUrl(PATHS.SUGGEST_STORES), { q: value }, function (results) {
        // 検索中に入力が変わっていたら結果を破棄
        if ($.trim($input.val()) !== value) return;
        render(results);
      });
    }

    function render(results) {
      $list.empty();

      if (results.length === 0) {
        var emptyMessage = options.emptyMessage || '該当する店舗がありません';
        $list.append($('<li class="cvs-suggest-empty"></li>').text(emptyMessage));
        $list.show();
        return;
      }

      $.each(results, function (i, store) {
        var $item = $('<li class="cvs-suggest-item"></li>');
        $item.append($('<span class="cvs-suggest-name"></span>').text(store.nm_cvs_store));
        $item.append($('<span class="cvs-suggest-meta"></span>').text(store.nm_cvs_chain + ' / ' + store.nm_region));
        $item.on('click', function () {
          options.onSelect(store);
          hide();
        });
        $list.append($item);
      });
      $list.show();
    }

    function hide() {
      $list.hide().empty();
    }

    // 入力欄への直接入力以外（お気に入り選択など）からも候補一覧を表示できるようにする。
    // 店舗名が同一チェーン内外で重複しうる場合に、呼び出し側が複数候補を渡して
    // 選び直してもらうために使う。
    return { hide: hide, showResults: render };
  }

  return { attach: attach };
})(jQuery);
