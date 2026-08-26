'use strict';

// チェーン名・立地条件・都道府県の選択肢マスタ
// クライアントにはIDと名称のセットで返すため、それぞれにidを付与する
const CHAINS = [
  { id: 1, name: 'セブンイレブン' },
  { id: 2, name: 'ファミリーマート' },
  { id: 3, name: 'ローソン' },
  { id: 4, name: 'ミニストップ' },
  { id: 5, name: 'デイリーヤマザキ' },
  { id: 6, name: 'セイコーマート' }
];

const LOCATION_TYPES = [
  { id: 1, name: '駅前' },
  { id: 2, name: '繁華街' },
  { id: 3, name: '郊外' },
  { id: 4, name: '住宅街' },
  { id: 5, name: 'オフィス街' },
  { id: 6, name: 'ロードサイド' }
];

const PREFECTURES = [
  { id: 1, name: '北海道' }, { id: 2, name: '青森県' }, { id: 3, name: '岩手県' }, { id: 4, name: '宮城県' },
  { id: 5, name: '秋田県' }, { id: 6, name: '山形県' }, { id: 7, name: '福島県' },
  { id: 8, name: '茨城県' }, { id: 9, name: '栃木県' }, { id: 10, name: '群馬県' }, { id: 11, name: '埼玉県' },
  { id: 12, name: '千葉県' }, { id: 13, name: '東京都' }, { id: 14, name: '神奈川県' },
  { id: 15, name: '新潟県' }, { id: 16, name: '富山県' }, { id: 17, name: '石川県' }, { id: 18, name: '福井県' },
  { id: 19, name: '山梨県' }, { id: 20, name: '長野県' },
  { id: 21, name: '岐阜県' }, { id: 22, name: '静岡県' }, { id: 23, name: '愛知県' }, { id: 24, name: '三重県' },
  { id: 25, name: '滋賀県' }, { id: 26, name: '京都府' }, { id: 27, name: '大阪府' }, { id: 28, name: '兵庫県' },
  { id: 29, name: '奈良県' }, { id: 30, name: '和歌山県' },
  { id: 31, name: '鳥取県' }, { id: 32, name: '島根県' }, { id: 33, name: '岡山県' }, { id: 34, name: '広島県' },
  { id: 35, name: '山口県' },
  { id: 36, name: '徳島県' }, { id: 37, name: '香川県' }, { id: 38, name: '愛媛県' }, { id: 39, name: '高知県' },
  { id: 40, name: '福岡県' }, { id: 41, name: '佐賀県' }, { id: 42, name: '長崎県' }, { id: 43, name: '熊本県' },
  { id: 44, name: '大分県' }, { id: 45, name: '宮崎県' }, { id: 46, name: '鹿児島県' },
  { id: 47, name: '沖縄県' }
];

function findIdByName(list, name) {
  const found = list.find((item) => item.name === name);
  return found ? found.id : null;
}

// 店舗マスタのダミーデータ（nm_cvs_store 相当が storeName）
// サジェスト検索を試しやすいよう、同一チェーン・類似名の店舗を複数含める
const STORES_BASE = [
  { id: 1, storeName: 'セブンイレブン渋谷駅前店', chainName: 'セブンイレブン', locationType: '駅前', prefecture: '東京都' },
  { id: 2, storeName: 'セブンイレブン渋谷道玄坂店', chainName: 'セブンイレブン', locationType: '繁華街', prefecture: '東京都' },
  { id: 3, storeName: 'セブンイレブン新宿三丁目店', chainName: 'セブンイレブン', locationType: '繁華街', prefecture: '東京都' },
  { id: 4, storeName: 'セブンイレブン新宿東口店', chainName: 'セブンイレブン', locationType: '駅前', prefecture: '東京都' },
  { id: 5, storeName: 'セブンイレブン新宿西口店', chainName: 'セブンイレブン', locationType: '駅前', prefecture: '東京都' },
  { id: 6, storeName: 'セブンイレブン横浜みなとみらい店', chainName: 'セブンイレブン', locationType: 'オフィス街', prefecture: '神奈川県' },
  { id: 7, storeName: 'セブンイレブン大阪梅田店', chainName: 'セブンイレブン', locationType: '繁華街', prefecture: '大阪府' },
  { id: 8, storeName: 'ファミリーマート横浜西口店', chainName: 'ファミリーマート', locationType: '駅前', prefecture: '神奈川県' },
  { id: 9, storeName: 'ファミリーマート横浜関内店', chainName: 'ファミリーマート', locationType: '繁華街', prefecture: '神奈川県' },
  { id: 10, storeName: 'ファミリーマート川崎駅前店', chainName: 'ファミリーマート', locationType: '駅前', prefecture: '神奈川県' },
  { id: 11, storeName: 'ファミリーマート名古屋栄店', chainName: 'ファミリーマート', locationType: '繁華街', prefecture: '愛知県' },
  { id: 12, storeName: 'ファミリーマート名古屋駅前店', chainName: 'ファミリーマート', locationType: '駅前', prefecture: '愛知県' },
  { id: 13, storeName: 'ファミリーマート福岡天神店', chainName: 'ファミリーマート', locationType: '繁華街', prefecture: '福岡県' },
  { id: 14, storeName: 'ローソン池袋東口店', chainName: 'ローソン', locationType: '駅前', prefecture: '東京都' },
  { id: 15, storeName: 'ローソン池袋西口店', chainName: 'ローソン', locationType: '駅前', prefecture: '東京都' },
  { id: 16, storeName: 'ローソン札幌大通店', chainName: 'ローソン', locationType: '繁華街', prefecture: '北海道' },
  { id: 17, storeName: 'ローソン札幌駅前店', chainName: 'ローソン', locationType: '駅前', prefecture: '北海道' },
  { id: 18, storeName: 'ローソン仙台国分町店', chainName: 'ローソン', locationType: '繁華街', prefecture: '宮城県' },
  { id: 19, storeName: 'ローソン郊外バイパス店', chainName: 'ローソン', locationType: 'ロードサイド', prefecture: '埼玉県' },
  { id: 20, storeName: 'ミニストップ千葉ニュータウン店', chainName: 'ミニストップ', locationType: '住宅街', prefecture: '千葉県' },
  { id: 21, storeName: 'ミニストップ浦和美園店', chainName: 'ミニストップ', locationType: '住宅街', prefecture: '埼玉県' },
  { id: 22, storeName: 'ミニストップ広島紙屋町店', chainName: 'ミニストップ', locationType: '繁華街', prefecture: '広島県' },
  { id: 23, storeName: 'デイリーヤマザキ京都四条店', chainName: 'デイリーヤマザキ', locationType: '繁華街', prefecture: '京都府' },
  { id: 24, storeName: 'デイリーヤマザキ甲府駅前店', chainName: 'デイリーヤマザキ', locationType: '駅前', prefecture: '山梨県' },
  { id: 25, storeName: 'デイリーヤマザキ郊外街道店', chainName: 'デイリーヤマザキ', locationType: 'ロードサイド', prefecture: '群馬県' },
  { id: 26, storeName: 'セイコーマート札幌北口店', chainName: 'セイコーマート', locationType: '駅前', prefecture: '北海道' },
  { id: 27, storeName: 'セイコーマート帯広本通店', chainName: 'セイコーマート', locationType: '繁華街', prefecture: '北海道' },
  { id: 28, storeName: 'セブンイレブン那覇国際通り店', chainName: 'セブンイレブン', locationType: '繁華街', prefecture: '沖縄県' }
];

// 各店舗にチェーン/立地条件/都道府県のIDも持たせる（名称からマスタを逆引き）
const STORES = STORES_BASE.map((store) => Object.assign({}, store, {
  chainId: findIdByName(CHAINS, store.chainName),
  locationTypeId: findIdByName(LOCATION_TYPES, store.locationType),
  prefectureId: findIdByName(PREFECTURES, store.prefecture)
}));

module.exports = { CHAINS, LOCATION_TYPES, PREFECTURES, STORES };
