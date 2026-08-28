# 調査対象店舗選択ウィジェット — 社内アプリ（Spring Boot + Thymeleaf）組み込み手順

このモックリポジトリの「調査対象店舗選択ポップアップ」＋「お気に入り店舗名の入力欄」を
社内アプリへ組み込むための資材と手順。

**表示方式**:
- 調査対象店舗選択（`storeSelectPopup`）… jQuery UI の `$().dialog()` で開く。
  タイトルバー・OK/キャンセル・暗幕・位置決めは jQuery UI が担当し、フラグメントには「中身」だけを置く。
- お気に入り店舗名（`favoriteEditFields`）… **単独ダイアログではなく**、社内アプリ側の
  既存ダイアログの中に入力欄セクションとして `th:replace` で埋め込む。JS の
  `CvsStoreWidget.FavoriteEdit` を、そのダイアログのライフサイクル（open / OK / close）にフックする。

## 前提

- 社内アプリの **jQuery**（ウィジェットは jQuery 1.7.2 で動作確認。バージョンは合わせる）
- 社内アプリの **jQuery UI**（`dialog` を含むビルド）。既に `.dialog()` を使っているなら読み込み済み。
  モックは検証用に jQuery UI 1.12.1 を `public/{js,css}/vendor/` に同梱している。

## コピーするファイル

| モック側 | 社内アプリ側（例） |
|---|---|
| `public/js/cvs/*.js`（6本） | `src/main/resources/static/js/cvs/` |
| `public/css/cvs-store-widget.layout.css` | `src/main/resources/static/css/`（中身の構造。全画面共用・変更不要） |
| `public/css/cvs-store-widget.theme.css` | `src/main/resources/static/css/`（中身の外観。スマホ/PC等で差し替え可） |
| `integration/cvs-store-select-popup.html` | `src/main/resources/templates/fragments/cvs-store-select-popup.html` |

CSS は名前空間化済み（クラスは `cvs-` 接頭辞、全セレクタ `.cvs-store-widget` 配下）で、
**ダイアログの中身だけ**をスタイルする。ダイアログの枠は社内アプリの jQuery UI テーマがそのまま効く。
`layout → theme` の順で読み込む。外観を画面幅で変えたいときは theme を複製 or `<link media="...">` で出し分け（layout は共用）。

**コピーしないもの:** `public/js/jquery-1.7.2.min.js`、`public/{js,css}/vendor/`（jQuery UI。社内アプリのものを使う）、
`public/js/main.js`（デモホスト専用の配線）、`public/index.html`、`server.js`、`config.js`、`data/`。

## ホスト画面（ポップアップを開く画面）への組み込み

### 1. フラグメントを埋め込む

**調査対象店舗選択ダイアログ** — 画面のどこでもよい（`dialog` 初期化時に jQuery UI が
`<body>` 直下へ移動する。ただし `<template>` の中は不可）:

```html
<div th:replace="~{fragments/cvs-store-select-popup :: storeSelectPopup}"></div>
```

**お気に入り店舗名の入力欄** — 既存ダイアログの**中身テンプレート内**、項目を出したい位置に:

```html
<!-- 社内アプリの既存ダイアログ（jQuery UI dialog）の中身 -->
<div id="userPrefsDialog" title="ユーザー設定" style="display:none;">
  ...既存の項目...
  <div th:replace="~{fragments/cvs-store-select-popup :: favoriteEditFields}"></div>
  ...既存の項目...
</div>
```

`favoriteEditFields` は `class="cvs-store-widget"` のラッパ＋`<div data-cvs-favorite-edit-rows>`
（行のマウント先）だけを含む。行そのものは JS の `mount()` が生成する。

### 2. スクリプト/スタイルを読み込む（順序が重要）

```html
<!-- head 内 -->
<link rel="stylesheet" th:href="@{/webjars/jquery-ui/…/jquery-ui.min.css}"><!-- 社内アプリ既存のもの -->
<link rel="stylesheet" th:href="@{/css/cvs-store-widget.layout.css}">
<link rel="stylesheet" th:href="@{/css/cvs-store-widget.theme.css}">

<!-- body 終端付近 -->
<script src="/js/jquery.min.js"></script>            <!-- 既存 -->
<script src="/js/jquery-ui.min.js"></script>          <!-- 既存（dialog を含む） -->

<!-- コンテキストパスをウィジェットへ渡す（cvs-api-config.js より前） -->
<script th:inline="javascript">
  window.CvsStoreWidget = window.CvsStoreWidget || {};
  window.CvsStoreWidget.config = window.CvsStoreWidget.config || {};
  window.CvsStoreWidget.config.contextPath = /*[[@{/}]]*/ '';
</script>

<!-- ウィジェット本体（この順序で） -->
<script th:src="@{/js/cvs/cvs-api-config.js}"></script>
<script th:src="@{/js/cvs/cvs-cookie-util.js}"></script>
<script th:src="@{/js/cvs/cvs-favorites-util.js}"></script>
<script th:src="@{/js/cvs/cvs-store-suggest.js}"></script>
<script th:src="@{/js/cvs/cvs-store-select.js}"></script>
<script th:src="@{/js/cvs/cvs-favorite-edit.js}"></script>
```

`@{/}` は Thymeleaf がコンテキストパス（末尾スラッシュ付き。例 `/cvs-survey/`、ルート直下なら `/`）を出力する。
`cvs-api-config.js` の `apiUrl()` が末尾スラッシュを正規化して各APIパスへ前置する。
共通レイアウトを使っているなら、これらはレイアウト側に置くのが楽。

### 3-1. 調査対象店舗選択ポップアップを開く

```js
// 文字列/数値を渡すと関連ファイルID/名として扱う（新規店舗登録リクエストに乗る）
CvsStoreWidget.StoreSelect.open(fileParam);

// オブジェクトで dialog の見た目をその場で指定できる（既存ダイアログの引数と同じ感覚）
CvsStoreWidget.StoreSelect.open({
  file: fileParam,
  title: '調査対象の店舗を選択',
  width: 560,
  height: 'auto',
  dialogOptions: { position: { my: 'center top', at: 'center top+80' } } // 任意の jQuery UI dialog オプション
});
```

サイズ・タイトルは CSS/HTML ではなく **`open()` の引数**で渡す。

### 3-2. お気に入り入力欄を既存ダイアログに配線する

`CvsStoreWidget.FavoriteEdit` の公開API:

| メソッド | 役割 | 呼びどころ |
|---|---|---|
| `mount(target?, options?)` | `target`（省略時 `[data-cvs-favorite-edit-rows]`）に入力行を生成しサジェストを付与。`options.count` で行数（既定10） | DOM ready 後に1回 |
| `load()` | Cookie（`favoriteStores`）から各入力欄を復元 | ダイアログの `open` |
| `save()` | 入力値を Cookie 保存 → `favorites-updated` 発火 → 保存後配列を返す | 保存ボタン / `beforeClose` |
| `getValues()` | 現在値（trim 済み配列。保存はしない） | 任意 |
| `reset()` | 全行のサジェスト候補を閉じる | ダイアログの `close` |

既存ダイアログ（jQuery UI dialog）への配線例:

```js
CvsStoreWidget.FavoriteEdit.mount('[data-cvs-favorite-edit-rows]');   // 1回だけ

$('#userPrefsDialog').dialog({
  autoOpen: false, modal: true, width: 480, appendTo: 'body',
  open:  function () { CvsStoreWidget.FavoriteEdit.load(); },          // 既存の open 処理に追記
  close: function () { CvsStoreWidget.FavoriteEdit.reset(); },
  buttons: [
    { text: '保存', click: function () {
        /* 既存項目の保存 ... */
        CvsStoreWidget.FavoriteEdit.save();
        $(this).dialog('close');
    } },
    { text: 'キャンセル', click: function () { $(this).dialog('close'); } }
  ]
});
```

- マウント先（か祖先）に `class="cvs-store-widget"` が必要（フラグメントに同梱済み）。
- サジェスト候補は `position:absolute`。ダイアログ中身が `overflow:auto` で行数が少ないと
  長い候補リストが見切れることがある（従来の単独ダイアログでも同様）。
- `mount()` 前に `load()` / `save()` を呼ぶとコンソール警告のみ（何もしない）。

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
- **ID 接頭辞**: `storeSelectPopup` フラグメント側の `#storeNameInput` `#chainSelect` 等がアプリと
  衝突しうる（CSS のクラス名は `cvs-` 接頭辞＋`.cvs-store-widget` スコープで対応済み。IDは未対応）。
  お気に入り入力欄の ID は `cvs-favorite-input-0..9` 済み。
- **お気に入り Cookie**: `favoriteStores`（`path=/`）。Cookie名前空間の衝突確認、
  コンテキストパスへの `path` 限定、サーバ永続化への置き換え要否。
- **認証**: モックの `config.local.js` 手書きCookieプロキシは検証用の割り切り。
  組み込み後は実アプリのセッションで直接APIを呼ぶ。
- **`window.confirm`**: 新規店舗登録確認のネイティブダイアログをアプリ流に揃える。
- **API 仕様の実機検証**: 一覧を「空bodyのPOST」で取る点、`PUT /api/stores` がサーバ側で
  ID採番する点が社内APIの実挙動と一致するか要確認。
