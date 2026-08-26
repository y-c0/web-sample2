'use strict';

// チェーン名・立地条件・都道府県の選択肢マスタ
// カラム名は実アプリ（社内本番API）の命名に合わせている
const CHAINS = [
  { cd_cvs_chain: 1, nm_cvs_chain: 'セブンイレブン' },
  { cd_cvs_chain: 2, nm_cvs_chain: 'ファミリーマート' },
  { cd_cvs_chain: 3, nm_cvs_chain: 'ローソン' },
  { cd_cvs_chain: 4, nm_cvs_chain: 'ミニストップ' },
  { cd_cvs_chain: 5, nm_cvs_chain: 'デイリーヤマザキ' },
  { cd_cvs_chain: 6, nm_cvs_chain: 'セイコーマート' }
];

const LOCATION_TYPES = [
  { cd_cvs_location: 1, nm_cvs_location: '駅前' },
  { cd_cvs_location: 2, nm_cvs_location: '繁華街' },
  { cd_cvs_location: 3, nm_cvs_location: '郊外' },
  { cd_cvs_location: 4, nm_cvs_location: '住宅街' },
  { cd_cvs_location: 5, nm_cvs_location: 'オフィス街' },
  { cd_cvs_location: 6, nm_cvs_location: 'ロードサイド' }
];

const PREFECTURES = [
  { cd_region: 1, nm_region: '北海道' }, { cd_region: 2, nm_region: '青森県' }, { cd_region: 3, nm_region: '岩手県' }, { cd_region: 4, nm_region: '宮城県' },
  { cd_region: 5, nm_region: '秋田県' }, { cd_region: 6, nm_region: '山形県' }, { cd_region: 7, nm_region: '福島県' },
  { cd_region: 8, nm_region: '茨城県' }, { cd_region: 9, nm_region: '栃木県' }, { cd_region: 10, nm_region: '群馬県' }, { cd_region: 11, nm_region: '埼玉県' },
  { cd_region: 12, nm_region: '千葉県' }, { cd_region: 13, nm_region: '東京都' }, { cd_region: 14, nm_region: '神奈川県' },
  { cd_region: 15, nm_region: '新潟県' }, { cd_region: 16, nm_region: '富山県' }, { cd_region: 17, nm_region: '石川県' }, { cd_region: 18, nm_region: '福井県' },
  { cd_region: 19, nm_region: '山梨県' }, { cd_region: 20, nm_region: '長野県' },
  { cd_region: 21, nm_region: '岐阜県' }, { cd_region: 22, nm_region: '静岡県' }, { cd_region: 23, nm_region: '愛知県' }, { cd_region: 24, nm_region: '三重県' },
  { cd_region: 25, nm_region: '滋賀県' }, { cd_region: 26, nm_region: '京都府' }, { cd_region: 27, nm_region: '大阪府' }, { cd_region: 28, nm_region: '兵庫県' },
  { cd_region: 29, nm_region: '奈良県' }, { cd_region: 30, nm_region: '和歌山県' },
  { cd_region: 31, nm_region: '鳥取県' }, { cd_region: 32, nm_region: '島根県' }, { cd_region: 33, nm_region: '岡山県' }, { cd_region: 34, nm_region: '広島県' },
  { cd_region: 35, nm_region: '山口県' },
  { cd_region: 36, nm_region: '徳島県' }, { cd_region: 37, nm_region: '香川県' }, { cd_region: 38, nm_region: '愛媛県' }, { cd_region: 39, nm_region: '高知県' },
  { cd_region: 40, nm_region: '福岡県' }, { cd_region: 41, nm_region: '佐賀県' }, { cd_region: 42, nm_region: '長崎県' }, { cd_region: 43, nm_region: '熊本県' },
  { cd_region: 44, nm_region: '大分県' }, { cd_region: 45, nm_region: '宮崎県' }, { cd_region: 46, nm_region: '鹿児島県' },
  { cd_region: 47, nm_region: '沖縄県' }
];

function findByCode(list, codeKey, code) {
  const found = list.find((item) => item[codeKey] === code);
  return found || null;
}

// 店舗マスタのダミーデータ。店舗名（nm_cvs_store）以外はチェーン/立地条件/都道府県の
// コード値で持たせ、名称は下のSTORESで各マスタから引いて付与する。
// サジェスト検索を試しやすいよう、同一チェーン・類似名の店舗を複数含める
const STORES_BASE = [
  { id_cvs_store: 1, nm_cvs_store: 'セブンイレブン渋谷駅前店', cd_cvs_chain: 1, cd_cvs_location: 1, cd_region: 13 },
  { id_cvs_store: 2, nm_cvs_store: 'セブンイレブン渋谷道玄坂店', cd_cvs_chain: 1, cd_cvs_location: 2, cd_region: 13 },
  { id_cvs_store: 3, nm_cvs_store: 'セブンイレブン新宿三丁目店', cd_cvs_chain: 1, cd_cvs_location: 2, cd_region: 13 },
  { id_cvs_store: 4, nm_cvs_store: 'セブンイレブン新宿東口店', cd_cvs_chain: 1, cd_cvs_location: 1, cd_region: 13 },
  { id_cvs_store: 5, nm_cvs_store: 'セブンイレブン新宿西口店', cd_cvs_chain: 1, cd_cvs_location: 1, cd_region: 13 },
  { id_cvs_store: 6, nm_cvs_store: 'セブンイレブン横浜みなとみらい店', cd_cvs_chain: 1, cd_cvs_location: 5, cd_region: 14 },
  { id_cvs_store: 7, nm_cvs_store: 'セブンイレブン大阪梅田店', cd_cvs_chain: 1, cd_cvs_location: 2, cd_region: 27 },
  { id_cvs_store: 8, nm_cvs_store: 'ファミリーマート横浜西口店', cd_cvs_chain: 2, cd_cvs_location: 1, cd_region: 14 },
  { id_cvs_store: 9, nm_cvs_store: 'ファミリーマート横浜関内店', cd_cvs_chain: 2, cd_cvs_location: 2, cd_region: 14 },
  { id_cvs_store: 10, nm_cvs_store: 'ファミリーマート川崎駅前店', cd_cvs_chain: 2, cd_cvs_location: 1, cd_region: 14 },
  { id_cvs_store: 11, nm_cvs_store: 'ファミリーマート名古屋栄店', cd_cvs_chain: 2, cd_cvs_location: 2, cd_region: 23 },
  { id_cvs_store: 12, nm_cvs_store: 'ファミリーマート名古屋駅前店', cd_cvs_chain: 2, cd_cvs_location: 1, cd_region: 23 },
  { id_cvs_store: 13, nm_cvs_store: 'ファミリーマート福岡天神店', cd_cvs_chain: 2, cd_cvs_location: 2, cd_region: 40 },
  { id_cvs_store: 14, nm_cvs_store: 'ローソン池袋東口店', cd_cvs_chain: 3, cd_cvs_location: 1, cd_region: 13 },
  { id_cvs_store: 15, nm_cvs_store: 'ローソン池袋西口店', cd_cvs_chain: 3, cd_cvs_location: 1, cd_region: 13 },
  { id_cvs_store: 16, nm_cvs_store: 'ローソン札幌大通店', cd_cvs_chain: 3, cd_cvs_location: 2, cd_region: 1 },
  { id_cvs_store: 17, nm_cvs_store: 'ローソン札幌駅前店', cd_cvs_chain: 3, cd_cvs_location: 1, cd_region: 1 },
  { id_cvs_store: 18, nm_cvs_store: 'ローソン仙台国分町店', cd_cvs_chain: 3, cd_cvs_location: 2, cd_region: 4 },
  { id_cvs_store: 19, nm_cvs_store: 'ローソン郊外バイパス店', cd_cvs_chain: 3, cd_cvs_location: 6, cd_region: 11 },
  { id_cvs_store: 20, nm_cvs_store: 'ミニストップ千葉ニュータウン店', cd_cvs_chain: 4, cd_cvs_location: 4, cd_region: 12 },
  { id_cvs_store: 21, nm_cvs_store: 'ミニストップ浦和美園店', cd_cvs_chain: 4, cd_cvs_location: 4, cd_region: 11 },
  { id_cvs_store: 22, nm_cvs_store: 'ミニストップ広島紙屋町店', cd_cvs_chain: 4, cd_cvs_location: 2, cd_region: 34 },
  { id_cvs_store: 23, nm_cvs_store: 'デイリーヤマザキ京都四条店', cd_cvs_chain: 5, cd_cvs_location: 2, cd_region: 26 },
  { id_cvs_store: 24, nm_cvs_store: 'デイリーヤマザキ甲府駅前店', cd_cvs_chain: 5, cd_cvs_location: 1, cd_region: 19 },
  { id_cvs_store: 25, nm_cvs_store: 'デイリーヤマザキ郊外街道店', cd_cvs_chain: 5, cd_cvs_location: 6, cd_region: 10 },
  { id_cvs_store: 26, nm_cvs_store: 'セイコーマート札幌北口店', cd_cvs_chain: 6, cd_cvs_location: 1, cd_region: 1 },
  { id_cvs_store: 27, nm_cvs_store: 'セイコーマート帯広本通店', cd_cvs_chain: 6, cd_cvs_location: 2, cd_region: 1 },
  { id_cvs_store: 28, nm_cvs_store: 'セブンイレブン那覇国際通り店', cd_cvs_chain: 1, cd_cvs_location: 2, cd_region: 47 }
];

// 検索結果・サジェスト表示用に、各店舗へチェーン/立地条件/都道府県の名称も
// マスタから引いて付与する（コードは既にSTORES_BASEが保持している）
const STORES = STORES_BASE.map((store) => {
  const chain = findByCode(CHAINS, 'cd_cvs_chain', store.cd_cvs_chain);
  const location = findByCode(LOCATION_TYPES, 'cd_cvs_location', store.cd_cvs_location);
  const region = findByCode(PREFECTURES, 'cd_region', store.cd_region);
  return Object.assign({}, store, {
    nm_cvs_chain: chain ? chain.nm_cvs_chain : null,
    nm_cvs_location: location ? location.nm_cvs_location : null,
    nm_region: region ? region.nm_region : null
  });
});

module.exports = { CHAINS, LOCATION_TYPES, PREFECTURES, STORES };
