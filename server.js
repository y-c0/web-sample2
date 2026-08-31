'use strict';

const express = require('express');
const path = require('path');
const { CHAINS, LOCATION_TYPES, PREFECTURES, STORES } = require('./data/stores');
const config = require('./config');

// このExpressアプリが公開するAPIのパス（クライアント側 public/js/cvs/cvs-api-config.js の config.paths と一致させる）
const ROUTES = {
  SUGGEST_STORES: '/api/stores/search',
  CHAINS: '/api/cvs_chains',
  LOCATIONS: '/api/cvs_locations',
  PREFECTURES: '/api/regions',
  REGISTER_TARGET_STORE: '/api/stores'
};

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 登録結果を保持するインメモリのモックストア
const registeredTargets = [];

// 新規店舗登録時にサーバー側で採番するID（店舗マスタの最大IDの続きから発行する）
let nextStoreId = Math.max.apply(null, STORES.map((store) => store.id_cvs_store)) + 1;

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

// 店舗検索: 通常は nm_cvs_store LIKE '%q%' 相当。
// id を指定した場合は id_cvs_store 完全一致で1件返す（q は無視）。呼び出し元が
// 前回選択した店舗を再表示するために使う。レスポンス形式は q 版と同じ store 配列。
app.get(ROUTES.SUGGEST_STORES, async (req, res) => {
  const q = (req.query.q || '').trim();
  const id = (req.query.id || '').trim();

  if (isProductionMode()) {
    try {
      const queryString = id ? '?id=' + encodeURIComponent(id)
        : (q ? '?q=' + encodeURIComponent(q) : '');
      const result = await proxyToProduction(config.PRODUCTION_PATHS.SUGGEST_STORES + queryString, 'GET');
      return res.status(result.status).json(result.data);
    } catch (err) {
      console.error('[production proxy] suggest failed:', err.message);
      return res.status(502).json({ message: '社内本番APIへの接続に失敗しました。' });
    }
  }

  if (id) {
    // 店舗マスタ ＋ このセッションで新規登録された店舗から1件（配列・0 or 1件）
    const pool = STORES.concat(registeredTargets);
    return res.json(pool.filter((store) => String(store.id_cvs_store) === String(id)).slice(0, 1));
  }

  if (!q) {
    return res.json([]);
  }
  const matches = STORES.filter((store) => store.nm_cvs_store.includes(q)).slice(0, 20);
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
  res.json({ records: CHAINS });
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
  res.json({ records: LOCATION_TYPES });
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
  res.json({ records: PREFECTURES });
});

// 調査対象店舗の確定登録（新規店舗の場合はサーバー側でIDを採番する）
app.put(ROUTES.REGISTER_TARGET_STORE, async (req, res) => {
  if (isProductionMode()) {
    try {
      const result = await proxyToProduction(config.PRODUCTION_PATHS.REGISTER_TARGET_STORE, 'PUT', req.body);
      return res.status(result.status).json(result.data);
    } catch (err) {
      console.error('[production proxy] register failed:', err.message);
      return res.status(502).json({ message: '社内本番APIへの接続に失敗しました。' });
    }
  }

  const {
    id_cvs_store, nm_cvs_store,
    cd_cvs_chain, nm_cvs_chain,
    cd_cvs_location, nm_cvs_location,
    cd_region, nm_region,
    file
  } = req.body || {};

  if (!nm_cvs_store || !cd_cvs_chain || !cd_cvs_location || !cd_region) {
    return res.status(400).json({ success: false, message: '必須項目が不足しています。' });
  }

  const record = {
    id_cvs_store: id_cvs_store || nextStoreId++,
    nm_cvs_store,
    cd_cvs_chain,
    nm_cvs_chain,
    cd_cvs_location,
    nm_cvs_location,
    cd_region,
    nm_region,
    file: file || null,
    registeredAt: new Date().toISOString()
  };
  registeredTargets.push(record);
  console.log(`[PUT ${ROUTES.REGISTER_TARGET_STORE}]`, record);

  // 確定登録した店舗データ（採番済みID含む）を records に入れて返す（マスタ系APIと同じ包み方）
  res.json({ records: record });
});

app.listen(PORT, () => {
  console.log(`Mock server listening at http://localhost:${PORT} (API_MODE=${config.API_MODE})`);
});
