'use strict';

const express = require('express');
const path = require('path');
const { CHAINS, LOCATION_TYPES, PREFECTURES, STORES } = require('./data/stores');
const config = require('./config');

// このExpressアプリが公開するAPIのパス（クライアント側 public/js/api-config.js の値と一致させる）
const ROUTES = {
  SUGGEST_STORES: '/api/stores/suggest',
  CHAINS: '/api/chains',
  LOCATIONS: '/api/locations',
  PREFECTURES: '/api/prefectures',
  REGISTER_TARGET_STORE: '/api/target-store/register'
};

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 登録結果を保持するインメモリのモックストア
const registeredTargets = [];

function isProductionMode() {
  return config.API_MODE === 'production';
}

/*
 * 社内本番APIへプロキシする。
 * ブラウザのJavaScriptは仕様上Cookieヘッダを直接付与できないため、
 * config.local.js に手書きしたログインCookieをこのサーバー（Node）側で付与して中継する。
 */
async function proxyToProduction(productionPath, method, body) {
  const url = config.PRODUCTION_BASE_URL + productionPath;
  const response = await fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: config.PRODUCTION_COOKIE
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data: data };
}

// 店舗名サジェスト検索: nm_cvs_store LIKE '%q%' 相当
app.get(ROUTES.SUGGEST_STORES, async (req, res) => {
  const q = (req.query.q || '').trim();

  if (isProductionMode()) {
    try {
      const queryString = q ? '?q=' + encodeURIComponent(q) : '';
      const result = await proxyToProduction(config.PRODUCTION_PATHS.SUGGEST_STORES + queryString, 'GET');
      return res.status(result.status).json(result.data);
    } catch (err) {
      console.error('[production proxy] suggest failed:', err.message);
      return res.status(502).json({ message: '社内本番APIへの接続に失敗しました。' });
    }
  }

  if (!q) {
    return res.json([]);
  }
  const matches = STORES.filter((store) => store.storeName.includes(q)).slice(0, 20);
  res.json(matches);
});

// チェーン名/立地条件/都道府県の選択肢一覧（既存アプリに合わせてPOST・bodyは空JSON）
app.post(ROUTES.CHAINS, async (req, res) => {
  if (isProductionMode()) {
    try {
      const result = await proxyToProduction(config.PRODUCTION_PATHS.CHAINS, 'POST', {});
      return res.status(result.status).json(result.data);
    } catch (err) {
      console.error('[production proxy] chains failed:', err.message);
      return res.status(502).json({ message: '社内本番APIへの接続に失敗しました。' });
    }
  }
  res.json(CHAINS);
});

app.post(ROUTES.LOCATIONS, async (req, res) => {
  if (isProductionMode()) {
    try {
      const result = await proxyToProduction(config.PRODUCTION_PATHS.LOCATIONS, 'POST', {});
      return res.status(result.status).json(result.data);
    } catch (err) {
      console.error('[production proxy] locations failed:', err.message);
      return res.status(502).json({ message: '社内本番APIへの接続に失敗しました。' });
    }
  }
  res.json(LOCATION_TYPES);
});

app.post(ROUTES.PREFECTURES, async (req, res) => {
  if (isProductionMode()) {
    try {
      const result = await proxyToProduction(config.PRODUCTION_PATHS.PREFECTURES, 'POST', {});
      return res.status(result.status).json(result.data);
    } catch (err) {
      console.error('[production proxy] prefectures failed:', err.message);
      return res.status(502).json({ message: '社内本番APIへの接続に失敗しました。' });
    }
  }
  res.json(PREFECTURES);
});

// 調査対象店舗の確定登録
app.post(ROUTES.REGISTER_TARGET_STORE, async (req, res) => {
  if (isProductionMode()) {
    try {
      const result = await proxyToProduction(config.PRODUCTION_PATHS.REGISTER_TARGET_STORE, 'POST', req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      console.error('[production proxy] register failed:', err.message);
      return res.status(502).json({ message: '社内本番APIへの接続に失敗しました。' });
    }
  }

  const { id, storeName, chainName, locationType, prefecture } = req.body || {};

  if (!storeName || !chainName || !locationType || !prefecture) {
    return res.status(400).json({ success: false, message: '必須項目が不足しています。' });
  }

  const record = {
    id: id || null,
    storeName,
    chainName,
    locationType,
    prefecture,
    registeredAt: new Date().toISOString()
  };
  registeredTargets.push(record);
  console.log('[POST /api/target-store/register]', record);

  res.json({ success: true, id: record.id });
});

app.listen(PORT, () => {
  console.log(`Mock server listening at http://localhost:${PORT} (API_MODE=${config.API_MODE})`);
});
