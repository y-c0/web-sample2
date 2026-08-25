'use strict';

// チェーン名・立地条件・都道府県の選択肢マスタ
const CHAINS = [
  'セブンイレブン',
  'ファミリーマート',
  'ローソン',
  'ミニストップ',
  'デイリーヤマザキ',
  'セイコーマート'
];

const LOCATION_TYPES = [
  '駅前',
  '繁華街',
  '郊外',
  '住宅街',
  'オフィス街',
  'ロードサイド'
];

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県',
  '沖縄県'
];

// 店舗マスタのダミーデータ（nm_cvs_store 相当が storeName）
// サジェスト検索を試しやすいよう、同一チェーン・類似名の店舗を複数含める
const STORES = [
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

module.exports = { CHAINS, LOCATION_TYPES, PREFECTURES, STORES };
