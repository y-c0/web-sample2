/*
 * APIエンドポイントのURL定数。
 *
 * クライアントは常にこのExpressサーバー自身（相対パス）にアクセスする。
 * モック応答／社内本番APIへのプロキシの切り替えはサーバー側 config.js（実際の値は
 * config.local.js に手書きする）で行う。ブラウザのJavaScriptからは認証Cookieヘッダを
 * 直接付与できないため、社内本番APIへの接続はこのサーバーが中継する方式にしている。
 */
var API_ENDPOINTS = {
  SUGGEST_STORES: '/api/stores/suggest',
  CHAINS: '/api/chains',
  LOCATIONS: '/api/locations',
  PREFECTURES: '/api/prefectures',
  REGISTER_TARGET_STORE: '/api/target-store/register'
};
