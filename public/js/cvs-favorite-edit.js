/*
 * お気に入り店舗編集ポップアップ
 * window.CvsStoreWidget.FavoriteEdit.open() / close() を公開する。
 * 保存に成功すると document に 'favorites-updated' カスタムイベントを発火する。
 */
window.CvsStoreWidget = window.CvsStoreWidget || {};

CvsStoreWidget.FavoriteEdit = (function ($) {
  'use strict';

  var FavoritesUtil = CvsStoreWidget.util.FavoritesUtil;
  var StoreSuggest = CvsStoreWidget.util.StoreSuggest;

  var $overlay, $rowsContainer, $formErrorMessage;
  var $inputs = [];
  var suggestControllers = [];

  function cacheElements() {
    $overlay = $('#favoriteEditModalOverlay');
    $rowsContainer = $('#favoriteEditRows');
    $formErrorMessage = $('#favoriteEditErrorMessage');
  }

  function buildRows() {
    for (var i = 0; i < FavoritesUtil.MAX_COUNT; i++) {
      addFavoriteRow(i);
    }
  }

  function addFavoriteRow(index) {
    var $row = $('<div class="form-row favorite-edit-row"></div>');
    $row.append($('<label></label>').attr('for', 'favoriteInput' + index).text((index + 1) + '.'));

    var $wrapper = $('<div class="autocomplete-wrapper"></div>');
    var $input = $('<input type="text" autocomplete="off">')
      .attr('id', 'favoriteInput' + index)
      .attr('placeholder', '店舗名を入力してください');
    var $list = $('<ul class="suggest-list" style="display:none;"></ul>');

    $wrapper.append($input).append($list);
    $row.append($wrapper);
    $rowsContainer.append($row);

    $inputs.push($input);
    suggestControllers.push(StoreSuggest.attach({
      $input: $input,
      $list: $list,
      onSelect: function (store) {
        $input.val(store.storeName);
      }
    }));
  }

  function open() {
    resetForm();
    var favorites = FavoritesUtil.getNames();
    $.each($inputs, function (i, $input) {
      $input.val(favorites[i] || '');
    });
    $overlay.show();
    $inputs[0].focus();
  }

  function close() {
    $overlay.hide();
    $.each(suggestControllers, function (i, controller) {
      controller.hide();
    });
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

  function bindEvents() {
    $('#btnFavoriteEditModalClose, #btnFavoriteEditCancel').on('click', close);

    $overlay.on('click', function (e) {
      if (e.target === $overlay[0]) close();
    });

    $(document).on('keydown', function (e) {
      if (e.keyCode === 27 && $overlay.is(':visible')) close();
    });

    $('#btnFavoriteEditSave').on('click', handleSave);
  }

  $(function () {
    cacheElements();
    buildRows();
    bindEvents();
  });

  return {
    open: open,
    close: close
  };
})(jQuery);
