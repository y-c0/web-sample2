'use strict';

const express = require('express');
const path = require('path');
const { CHAINS, LOCATION_TYPES, PREFECTURES, STORES } = require('./data/stores');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 登録結果を保持するインメモリのモックストア
const registeredTargets = [];

// 店舗名サジェスト検索: nm_cvs_store LIKE '%q%' 相当
app.get('/api/stores/suggest', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.json([]);
  }

  const matches = STORES.filter((store) => store.storeName.includes(q)).slice(0, 20);
  res.json(matches);
});

// チェーン名/立地条件/都道府県の選択肢一覧（既存アプリに合わせてPOST・bodyは空JSON）
app.post('/api/chains', (req, res) => {
  res.json(CHAINS);
});

app.post('/api/locations', (req, res) => {
  res.json(LOCATION_TYPES);
});

app.post('/api/prefectures', (req, res) => {
  res.json(PREFECTURES);
});

// 調査対象店舗の確定登録（モック）
app.post('/api/target-store/register', (req, res) => {
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
  console.log(`Mock server listening at http://localhost:${PORT}`);
});
