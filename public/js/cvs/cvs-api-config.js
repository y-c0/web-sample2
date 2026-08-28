/*
 * ウィジェットのAjax設定を一箇所に集約する。
 * jQuery の直後・他の cvs-*.js より前に読み込むこと。
 *
 * - CvsStoreWidget.config.contextPath : アプリのコンテキストパス。
 *     画面側が先に window.CvsStoreWidget.config.contextPath を文字列でセットしていれば
 *     それを尊重する。未設定なら '' （＝ルート直下。モックはこのまま動く）。
 *     社内アプリ（Spring Boot + Thymeleaf）での渡し方は integration/README.md を参照
 *     （このスクリプトより前に th:inline スクリプトで contextPath をセットする）。
 * - CvsStoreWidget.config.paths  : APIの相対パス（コンテキストパスは含めない）。
 *     従来 cvs-store-select.js / cvs-store-suggest.js に重複定義していた API_ENDPOINTS をここへ統合。
 * - CvsStoreWidget.util.apiUrl(path) : contextPath を前置した実際のURLを返す。
 */
window.CvsStoreWidget = window.CvsStoreWidget || {};
window.CvsStoreWidget.util = window.CvsStoreWidget.util || {};

(function (CvsStoreWidget) {
  'use strict';

  var config = CvsStoreWidget.config || (CvsStoreWidget.config = {});

  // 画面側が既に文字列でセットしていれば尊重する。未設定時のみ '' を既定にする。
  if (typeof config.contextPath !== 'string') {
    config.contextPath = '';
  }

  config.paths = {
    SUGGEST_STORES: '/api/stores/search',
    CHAINS: '/api/cvs_chains',
    LOCATIONS: '/api/cvs_locations',
    PREFECTURES: '/api/regions',
    REGISTER_TARGET_STORE: '/api/stores'
  };

  // contextPath（末尾スラッシュは除去）＋ 先頭スラッシュ付きの相対パス。
  // contextPath が '' のときはパスをそのまま返す（モックの従来挙動と一致）。
  CvsStoreWidget.util.apiUrl = function (path) {
    var ctx = (CvsStoreWidget.config && CvsStoreWidget.config.contextPath) || '';
    ctx = ctx.replace(/\/+$/, '');
    if (path.charAt(0) !== '/') {
      path = '/' + path;
    }
    return ctx + path;
  };
})(window.CvsStoreWidget);
