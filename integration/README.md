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
| `public/css/cvs-store-widget.theme.css` | `src/main/resources/static/css/`（**任意**。中身の外観の既定値。アプリCSSで代替可） |
| `integration/cvs-store-select-popup.html` | `src/main/resources/templates/fragments/cvs-store-select-popup.html` |

CSS は名前空間化済み（クラスは `cvs-` 接頭辞、全セレクタ `.cvs-store-widget` 配下）で、
**ダイアログの中身だけ**をスタイルする。ダイアログの枠は社内アプリの jQuery UI テーマがそのまま効く。

- `layout.css` … 構造（位置・重なり・flex・サジェストの配置）。必須・変更しない。
- `theme.css` … 外観（色・余白・枠線・影・ホバー）の既定値。**使わずにアプリのCSSで
  当てても良い**（下記「3-3」参照）。使う場合は `layout → theme` の順で読み込む。
  画面幅で変えたいときは theme を複製 or `<link media="...">` で出し分け（layout は共用）。

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
<link rel="stylesheet" th:href="@{/css/cvs-store-widget.theme.css}"><!-- 任意。アプリCSSで代替するなら不要（3-3参照） -->

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

// オブジェクトで詳細指定
CvsStoreWidget.StoreSelect.open({
  file: fileParam,
  storeId: prevStoreId,   // ★ 前回選んだ店舗IDを渡すと、その店舗を選択済みの状態で開く
  title: '店舗選択',
  width: 560,
  height: 'auto',
  dialogOptions: { position: { my: 'center top', at: 'center top+80' } } // 任意の jQuery UI dialog オプション
});

// 前回の store-selected payload をそのまま渡してもよい（id_cvs_store を storeId として解釈する）
CvsStoreWidget.StoreSelect.open(prevSelection);
```

- サイズ・タイトルは CSS/HTML ではなく **`open()` の引数**で渡す。
- `storeId`（別名 `id_cvs_store`）… 呼び出し元が確定時の `store-selected` から受け取った
  `id_cvs_store` を保持しておき、ポップアップを開き直すときに渡す。ウィジェットが
  `GET /api/stores/search?id=<storeId>` で1件取得し、店舗名・チェーン名・立地条件・都道府県を
  選択済みにする。未変更のまま OK すると登録APIは呼ばれず同じIDが `store-selected` で返る。
  IDが見つからない場合は空のまま開く（コンソール警告のみ）。渡さなければ従来どおり空で開く。

**バックエンド要件**: `/api/stores/search` は `?q=` に加えて **`?id=<id_cvs_store>`** を受け付け、
該当店舗1件を含む配列
`[ { id_cvs_store, nm_cvs_store, cd_cvs_chain, nm_cvs_chain, cd_cvs_location, nm_cvs_location, cd_region, nm_region } ]`
を返すこと（該当なしは `[]`）。`id` 指定時は `q` を無視する。

### 3-2. お気に入り入力欄を既存ダイアログに配線する

`CvsStoreWidget.FavoriteEdit` の公開API:

| メソッド | 役割 | 呼びどころ |
|---|---|---|
| `mount(target?, options?)` | `target`（省略時 `[data-cvs-favorite-edit-rows]`）に入力行を生成しサジェストを付与。`options.count` で行数（既定10） | ページ初期化時に1回 |
| `load()` | Cookie（`favoriteStores`）から各入力欄を復元 | ダイアログの `dialogopen` |
| `save()` | 入力値を Cookie 保存 → `favorites-updated` 発火 → 保存後配列を返す | 既存の「保存」処理の中 |
| `getValues()` | 現在値（trim 済み配列。保存はしない） | 任意 |
| `reset()` | 全行のサジェスト候補を閉じる | ダイアログの `dialogclose` |

**既存ダイアログの `dialog({...})` 定義には手を入れない。** `open` / `close` は
コールバックが1個しか持てず（後勝ちで既存の処理が消える）、`autoOpen` は初期化済み
ダイアログには効かない。代わりに**重ねられるイベント** `dialogopen` / `dialogclose` で足す:

```js
// ページ初期化時に1回（ダイアログの開閉タイミングとは無関係）
CvsStoreWidget.FavoriteEdit.mount('[data-cvs-favorite-edit-rows]');

// 既存ダイアログの定義は触らず、イベントで追加フックする
$('#userPrefsDialog')
  .on('dialogopen',  function () { CvsStoreWidget.FavoriteEdit.load(); })
  .on('dialogclose', function () { CvsStoreWidget.FavoriteEdit.reset(); });
```

保存は、**既存の「保存」ボタン／submit ハンドラの中**に1行足すだけ:

```js
// 既存項目の保存処理 ...
CvsStoreWidget.FavoriteEdit.save();   // Cookie 保存 + favorites-updated 発火
```

- マウント先（か祖先）に `class="cvs-store-widget"` が必要（フラグメントに同梱済み）。
- 開いた時にだけ復元したいので `load()` は `dialogopen` で。`dialogbeforeclose` で
  `return false` すると閉じるのを止められる（入力チェックを挟みたい場合）。
- サジェスト候補リストは `position:fixed`（`layout.css`）で、`cvs-store-suggest.js` が
  入力欄の実座標から位置・幅を設定する。ダイアログ中身の `overflow:auto` に
  クリップされず、ネイティブ `<select>` の展開リストと同様にダイアログ外へはみ出す
  （下に入りきらなければ上向きに開く）。祖先要素に `transform` / `filter` /
  `perspective` を掛けると `fixed` の基準がその要素になり位置がずれるので注意。
- `mount()` 前に `load()` / `save()` を呼ぶとコンソール警告のみ（何もしない）。

### 3-3. サジェスト候補の見た目をアプリに合わせる（`theme.css` を使わない場合）

`layout.css` だけを読み込む構成では、サジェストのドロップダウン（`.cvs-suggest-*`）は
**構造だけ**が当たった状態（位置は正しいが枠線・影・行の余白・ホバーなし）。
`theme.css` を使わず社内アプリのCSSに次を追記して、アプリのフォームに馴染ませる。
色はアプリの `<input>` / `<select>` の枠色・選択色（できれば既存のCSS変数）に合わせて調整する。

```css
/* 社内アプリのCSS（フォーム系スタイルの近く）に追記。値は要調整 */
.cvs-store-widget ul.cvs-suggest-list{
  margin:1px 0 0; background:#fff;
  border:1px solid #767676;          /* アプリの input/select の枠色に合わせる */
  border-radius:2px;
  box-shadow:0 2px 4px rgba(0,0,0,.2);
  font:inherit;
}
.cvs-store-widget .cvs-suggest-list > li.cvs-suggest-item{
  padding:4px 8px; cursor:pointer;
}
.cvs-store-widget .cvs-suggest-list > li.cvs-suggest-item:hover{
  background:Highlight; color:HighlightText;   /* OSの選択色。固定にするなら #cde8ff 等 */
}
.cvs-store-widget .cvs-suggest-meta{ color:#666; font-size:.85em; margin-left:8px }
.cvs-store-widget .cvs-suggest-empty{ padding:4px 8px; color:#666 }
```

- `ul.` / `> li.` と要素修飾を付けているのは、埋め込み先ダイアログ側の `li` リセット
  （`... li { padding:0; list-style:none }` 等）に**詳細度で負けない**ため。効かないときは
  さらに親（`#既存ダイアログID .cvs-suggest-item`）を足す。
- ドロップダウンの幅・位置は `cvs-store-suggest.js` が入力欄の実寸から設定する（`<select>` と同じく入力欄ぴったり）。CSS 側で `width` / `top` / `left` を上書きしない。
- 閉じている状態はただの `<input type="text">`。アプリが `input` をスタイル済みなら自動で揃う。
- **スマホ版**を作るときは、この `.cvs-suggest-*` を `@media` でタップ向けに調整する
  （`padding` を広げる、`:hover` ルールは外す、`max-height` を見直す 等）。アプリのレスポンシブCSSの
  一部として管理する。ネイティブ `<select>` の展開リストは OS 描画のため完全一致はできない。
- 置き場所は**アプリのCSS**（ウィジェットの `layout.css` は書き換えない）。ウィジェット更新時に
  上書き・コンフリクトしないため。

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
| 店舗名サジェスト | GET | `/api/stores/search?q=...`（または `?id=<id_cvs_store>`） |
| チェーン名一覧 | POST（空JSON） | `/api/cvs_chains` |
| 立地条件一覧 | POST（空JSON） | `/api/cvs_locations` |
| 都道府県一覧 | POST（空JSON） | `/api/regions` |
| 調査対象店舗の確定登録 | PUT | `/api/stores` |

- 一覧系レスポンスは `{ "records": [ ... ] }` 形式を期待する。
- サジェストAPIのレスポンスは store オブジェクトの**配列**（`?q=` / `?id=` とも同形式、該当なしは `[]`）。
- **確定登録 `PUT /api/stores` のレスポンスは `{ "records": { ...店舗1件... } }`**（オブジェクト。配列ではない）。
  ウィジェットは `response.records`（採番済み `id_cvs_store` を含む店舗データ）を `store-selected` の
  payload に使う。`records` に含めるべき項目:
  `id_cvs_store, nm_cvs_store, cd_cvs_chain, nm_cvs_chain, cd_cvs_location, nm_cvs_location, cd_region, nm_region`。
- パスが社内APIと異なる場合は `cvs-api-config.js` の `config.paths` を書き換える。

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
