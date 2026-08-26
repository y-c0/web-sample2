'use strict';

const fs = require('fs');
const path = require('path');

/*
 * API接続モードの切り替え設定
 *
 * - 'mock'       : このリポジトリ内のダミーデータで応答するモックAPIを使用する（既定）
 * - 'production' : 社内本番APIにExpress側でプロキシしてテスト接続する
 *
 * 社内本番API（PRODUCTION_BASE_URL・PRODUCTION_COOKIE）はこのファイルには書かず、
 * config.local.example.js を config.local.js としてコピーして書き込む。
 * config.local.js は .gitignore 済みのためコミットされない。
 */
const defaults = {
  API_MODE: 'mock',
  PRODUCTION_BASE_URL: '',
  PRODUCTION_PATHS: {
    SUGGEST_STORES: '/api/stores/suggest',
    CHAINS: '/api/chains',
    LOCATIONS: '/api/locations',
    PREFECTURES: '/api/prefectures',
    REGISTER_TARGET_STORE: '/api/target-store/register'
  },
  // 社内アプリにログインした際のCookieヘッダの値（config.local.js で上書きする想定。中身の説明は config.local.example.js を参照）
  PRODUCTION_COOKIE: ''
};

let localOverrides = {};
const localConfigPath = path.join(__dirname, 'config.local.js');
if (fs.existsSync(localConfigPath)) {
  localOverrides = require(localConfigPath);
}

module.exports = Object.assign({}, defaults, localOverrides, {
  PRODUCTION_PATHS: Object.assign({}, defaults.PRODUCTION_PATHS, localOverrides.PRODUCTION_PATHS)
});
