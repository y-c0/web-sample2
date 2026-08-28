# 調査対象店舗選択ウィジェット — 社内アプリ（Spring Boot + Thymeleaf）組み込み手順

このモックリポジトリの「調査対象店舗選択ポップアップ」＋「お気に入り編集ポップアップ」を
社内アプリへ組み込むための資材と手順。

## コピーするファイル

| モック側 | 社内アプリ側（例） |
|---|---|
| `public/js/cvs/*.js`（6本） | `src/main/resources/static/js/cvs/` |
| `integration/cvs-store-select-popup.html` | `src/main/resources/templates/fragments/cvs-store-select-popup.html` |
| `public/css/style.css` のモーダル関連部分 | アプリのCSSへ（`.modal` `.modal-overlay` `.form-row` `.btn` `.suggest-list` `.favorites-list` `.favorite-chip` `.hint` `.error-message` `.required` など） |

**コピーしないもの:** `public/js/jquery-1.7.2.min.js`（社内アプリの jQuery を使う）、
`public/js/main.js`（デモホスト画面専用の配線）、`public/index.html`、`server.js`、`config.js`、`data/`。

## ホスト画面（ポップアップを開く画面）への組み込み

### 1. フラグメントを埋め込む

```html
<div th:replace="~{fragments/cvs-store-select-popup :: storeSelectPopup}"></div>
<div th:replace="~{fragments/cvs-store-select-popup :: favoriteEditPopup}"></div>
```

必要なポップアップだけでよい（片方だけの埋め込みも可。使われない側のJSは初期化ガードで空振りする）。

### 2. スクリプトを読み込む（読み込み順が重要）

```html
<!-- 1. jQuery（アプリ既存のものを利用。二重読み込みしない） -->
<script src="/js/jquery.min.js"></script>

<!-- 2. コンテキストパスをウィジェットへ渡す（cvs-api-config.js より前） -->
<script th:inline="javascript">
  window.CvsStoreWidget = window.CvsStoreWidget || {};
  window.CvsStoreWidget.config = window.CvsStoreWidget.config || {};
  window.CvsStoreWidget.config.contextPath = /*[[@{/}]]*/ '';
</script>

<!-- 3. ウィジェット本体（この順序で） -->
<script th:src="@{/js/cvs/cvs-api-config.js}"></script>
<script th:src="@{/js/cvs/cvs-cookie-util.js}"></script>
<script th:src="@{/js/cvs/cvs-favorites-util.js}"></script>
<script th:src="@{/js/cvs/cvs-store-suggest.js}"></script>
<script th:src="@{/js/cvs/cvs-store-select.js}"></script>
<script th:src="@{/js/cvs/cvs-favorite-edit.js}"></script>
```

`@{/}` は Thymeleaf がコンテキストパス（末尾スラッシュ付き。例 `/cvs-survey/`、ルート直下なら `/`）を出力する。
`cvs-api-config.js` の `apiUrl()` が末尾スラッシュを正規化して各APIパスへ前置する。
共通レイアウト（`layout:fragment` 等）を使っているなら 2・3 はレイアウト側に置くのが楽。

### 3. ポップアップを開く

```js
// 調査対象店舗の選択（file は新規店舗登録リクエストに乗せる関連ファイルID/名。任意）
CvsStoreWidget.StoreSelect.open(fileParam);

// お気に入り店舗の編集
CvsStoreWidget.FavoriteEdit.open();
```

### 4. 結果を受け取る（`document` のカスタムイベント）

```js
$(document).on('store-selected', function (e, store) {
  // store の形: {
  //   id_cvs_store,               // 既存店舗は数値ID。新規店舗は登録API採番後のID
  //   nm_cvs_store,
  //   cd_cvs_chain, nm_cvs_chain,
  //   cd_cvs_location, nm_cvs_location,
  //   cd_region, nm_region,
  //   file                        // 新規店舗登録時のみ。open() に渡した値
  // }
});

$(document).on('favorites-updated', function (e, savedNames) {
  // savedNames: 保存された店舗名の配列（trim・重複排除済み、最大10件）
});
```

## API

ウィジェットは常に**自アプリのオリジン + コンテキストパス**に対して呼ぶ（`cvs-api-config.js` の `config.paths`）。

| 用途 | メソッド | パス（コンテキストパス相対） |
|---|---|---|
| 店舗名サジェスト | GET | `/api/stores/search?q=...` |
| チェーン名一覧 | POST（空JSON） | `/api/cvs_chains` |
| 立地条件一覧 | POST（空JSON） | `/api/cvs_locations` |
| 都道府県一覧 | POST（空JSON） | `/api/regions` |
| 調査対象店舗の確定登録 | PUT | `/api/stores` |

一覧系レスポンスは `{ "records": [ ... ] }` 形式を期待する。
パスが社内APIと異なる場合は `cvs-api-config.js` の `config.paths` を書き換える。

## 組み込み時の残課題（このモックでは未対応）

- **CSRF トークン**: 社内アプリで Spring Security の CSRF 保護が有効なら、非GET
  （`/api/cvs_chains` 等の POST、`/api/stores` の PUT）が 403 になる。
  `<meta name="_csrf">` / `<meta name="_csrf_header">` を出力し、非GETの `$.ajax` に
  ヘッダを付与する処理を `cvs-api-config.js` に追加する。
- **CSS スコープ**: `.modal` `.btn` 等が汎用的。`.cvs-store-widget` 配下へネストして
  アプリCSSとの衝突を避ける。
- **ID 接頭辞**: `#storeNameInput` `#chainSelect` `#btnConfirm` 等がアプリと衝突しうる。
- **お気に入り Cookie**: `favoriteStores`（`path=/`）。Cookie名前空間の衝突確認、
  コンテキストパスへの `path` 限定、サーバ永続化への置き換え要否。
- **認証**: モックの `config.local.js` 手書きCookieプロキシは検証用の割り切り。
  組み込み後は実アプリのセッションで直接APIを呼ぶ。
- **`window.confirm`**: 新規店舗登録確認のネイティブダイアログをアプリのモーダルに揃える。
- **API 仕様の実機検証**: 一覧を「空bodyのPOST」で取る点、`PUT /api/stores` がサーバ側で
  ID採番する点が社内APIの実挙動と一致するか要確認。
