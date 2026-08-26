/*
 * 店舗名サジェスト（Ajax, /api/stores/suggest）を任意のテキスト入力欄に付与する共通部品。
 * 店舗選択ポップアップ・お気に入り編集ポップアップの双方から利用する。
 */
var StoreSuggest = (function ($) {
  'use strict';

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

    $input.on('input', function () {
      if (typeof options.onChange === 'function') {
        options.onChange();
      }

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
    });

    $(document).on('click', function (e) {
      if (!$(e.target).closest($input.parent()).length) {
        hide();
      }
    });

    function fetchSuggestions(value) {
      $.getJSON(API_ENDPOINTS.SUGGEST_STORES, { q: value }, function (results) {
        // 検索中に入力が変わっていたら結果を破棄
        if ($.trim($input.val()) !== value) return;
        render(results);
      });
    }

    function render(results) {
      $list.empty();

      if (results.length === 0) {
        var emptyMessage = options.emptyMessage || '該当する店舗がありません';
        $list.append($('<li class="suggest-empty"></li>').text(emptyMessage));
        $list.show();
        return;
      }

      $.each(results, function (i, store) {
        var $item = $('<li class="suggest-item"></li>');
        $item.append($('<span class="suggest-name"></span>').text(store.storeName));
        $item.append($('<span class="suggest-meta"></span>').text(store.chainName + ' / ' + store.prefecture));
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

    return { hide: hide };
  }

  return { attach: attach };
})(jQuery);
