'use strict';

/*
 * 社内本番APIへのテスト接続用ローカル設定のテンプレート。
 *
 * 使い方:
 *   1. このファイルを config.local.js としてコピーする（config.local.js は .gitignore 済み）
 *   2. 社内アプリにブラウザでログインした状態で、開発者ツール(Network)を開き、
 *      任意のリクエストの Request Headers から「cookie」の値をコピーして
 *      PRODUCTION_COOKIE にそのまま貼り付ける
 *   3. PRODUCTION_BASE_URL を実際の社内本番APIのオリジンに書き換える
 *   4. API_MODE を 'production' にする
 *   5. node server.js（または npm start）で起動すると、
 *      /api/... へのアクセスがサーバー側でCookie付きの本番APIリクエストに変換される
 *
 * 【取り扱い注意】PRODUCTION_COOKIE は個人のログインセッション情報そのものです。
 * 他人に共有したり、このファイルをコミットしたりしないでください。
 */
module.exports = {
  API_MODE: 'production',

  PRODUCTION_BASE_URL: 'https://internal-cvs-survey.example.co.jp',

  // 社内本番API側の実際のエンドポイントパスに合わせて必要なら書き換える
  PRODUCTION_PATHS: {
    SUGGEST_STORES: '/api/stores/suggest',
    CHAINS: '/api/chains',
    LOCATIONS: '/api/locations',
    PREFECTURES: '/api/prefectures',
    REGISTER_TARGET_STORE: '/api/target-store/register'
  },

  // 例: 'JSESSIONID=xxxxxxxxxxxxxxxx; other_session=yyyyyyyy'
  PRODUCTION_COOKIE: ''
};
