/**
 * DNA診断AI — スプシ行整形テスト
 *
 * 実 append は行わない (Sheets API 認証情報不要)。
 * ダミーの diagnoses + celestial_results + scores + narratives + reports + clones から
 * 整形された DiagnosisSheetRow を生成し、scripts/sample-sheet-row.json に書き出す。
 *
 * 実行: npx tsx scripts/test-sheets-format.ts
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildRow } from '../src/lib/sheets/appender';
import {
  SHEET_COLUMN_ORDER,
  EXPECTED_COLUMN_COUNT,
} from '../src/lib/sheets/types';
import type {
  DiagnosesRow,
  CelestialResultsJson,
  ScoresJson,
  NarrativesRow,
} from '../src/lib/supabase/database.types';

const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname);

// ---- ダミーデータ ----
const diag: DiagnosesRow = {
  id: 'sample-uuid-aaaa-1111',
  user_id: null,
  status: 'completed',
  relationship_tag: 'マブダチ',
  email: 'test@example.com',
  full_name: 'サンプル ユーザー',
  family_name: 'サンプル',
  given_name: 'ユーザー',
  birth_date: '1985-09-22',
  birth_time: '14:35:00',
  birth_place_name: '東京都新宿区',
  birth_place_lat: 35.6938,
  birth_place_lng: 139.7034,
  birth_place_tz: 'Asia/Tokyo',
  lp_source: 'twitter_organic',
  metadata: { tags: ['触媒', '構造設計', '本質直視', '即決即動', '俯瞰'] },
  created_at: '2026-04-28T03:00:00.000Z',
  updated_at: '2026-04-28T03:25:00.000Z',
  completed_at: '2026-04-28T03:25:00.000Z',
};

const celestial: CelestialResultsJson = {
  shichuu: {
    dayPillar: '甲子',
    yearPillar: '乙丑',
    monthPillar: '丙寅',
    hourPillar: '丁卯',
  },
  shibi: { mainStar: '紫微' },
  kyusei: { main: '二黒土星', monthly: '九紫火星' },
  shukuyou: { xiu: '柳宿' },
  maya: { kin: 22 },
  numerology: { lifePath: 22 },
  western: {
    sun: { sign: 'おとめ座' },
    moon: { sign: 'いて座' },
    ascendant: { sign: 'やぎ座' },
  },
  humanDesign: { type: 'マニフェスター' },
  seimei: { summary: '吉凶混合・リーダー格' },
  sanmei: { summary: '陽占=石門・天将・玉堂' },
  animal: { character: '長距離ランナーのチーター' },
  day366: { type: '実直な開拓者' },
  season: { season: '冬' },
  teiou: { type: '王の器' },
  twelveStar: { main: '海王星' },
  biorhythm: { phase: '上昇期' },
  computedAt: '2026-04-28T03:00:00Z',
  durationsMs: { shichuu: 12, western: 8 },
};

const scores: ScoresJson = {
  big5: { O: 88, C: 72, E: 65, A: 58, N: 32 },
  derived16Type: '建築家タイプ',
  riasec: { R: 30, I: 80, A: 85, S: 50, E: 75, C: 45 },
  vak: { V: 70, A: 50, K: 80 },
  enneagram: { '1': 40, '2': 25, '3': 60, '4': 70, '5': 80, '6': 30, '7': 55, '8': 65, '9': 35 },
  attachment: { secure: 75, anxious: 30, avoidant: 45, disorganized: 10 },
  loveLanguage: { words: 30, time: 70, gifts: 20, service: 50, touch: 40 },
  entrepreneurType: { creator: 80, mechanic: 60, lord: 35, accumulator: 25, deal_maker: 50, trader: 40, supporter: 30, star: 70 },
};

const narratives: NarrativesRow[] = [
  {
    id: 'n-1',
    diagnosis_id: diag.id,
    q_id: 'n1',
    content:
      '一晩中ホワイトボードに構造図を描いてた時。クライアントの事業の歪みが線で見えた瞬間に時間が消えた。次の朝には腹が減ってない自分にちょっと笑った。',
    written_at: '2026-04-28T03:10:00Z',
  },
  {
    id: 'n-2',
    diagnosis_id: diag.id,
    q_id: 'n2',
    content:
      '本質を見ようとしない人間に怒る。表層だけなぞって「分かりました」と言う人。怒鳴りはしないが、その人とは仕事しない判断を即決する。',
    written_at: '2026-04-28T03:11:00Z',
  },
  {
    id: 'n-3',
    diagnosis_id: diag.id,
    q_id: 'n3',
    content: '人の事業の構造を整理して言語化すること。報酬がなくても3時間は喋れる。',
    written_at: '2026-04-28T03:12:00Z',
  },
  {
    id: 'n-4',
    diagnosis_id: diag.id,
    q_id: 'n4',
    content:
      '①嘘をつかない ②本質から逃げない ③人を数で扱わない。この3つは絶対に曲げない。',
    written_at: '2026-04-28T03:13:00Z',
  },
  {
    id: 'n-5',
    diagnosis_id: diag.id,
    q_id: 'n5',
    content: '「説明が分かりやすい」「決断が早い」「人をちゃんと見てる」。よく言われる3つ。',
    written_at: '2026-04-28T03:14:00Z',
  },
  {
    id: 'n-6',
    diagnosis_id: diag.id,
    q_id: 'n6',
    content:
      '5年後、自分の頭の中の構造化フレームを誰でも使える形で世に出している。それを使って起業家が10万人増えている。',
    written_at: '2026-04-28T03:15:00Z',
  },
  {
    id: 'n-7',
    diagnosis_id: diag.id,
    q_id: 'n7',
    content: 'スティーブ・ジョブズの本質直視。糸井重里の言語化センス。岡本太郎の生き様。',
    written_at: '2026-04-28T03:16:00Z',
  },
  {
    id: 'n-style',
    diagnosis_id: diag.id,
    q_id: 'style_sample',
    content:
      '正直、僕は人をジャッジするのが嫌いなんだけど、構造を見ようとしない人とは仕事できない。これは性格の問題じゃなくて、時間と命の使い方の話だ。だから僕は判断を急がない代わりに、判断したら絶対に揺れない。揺れる時間がもったいないからだ。',
    written_at: '2026-04-28T03:17:00Z',
  },
  {
    id: 'n-ng',
    diagnosis_id: diag.id,
    q_id: 'ng_expressions',
    content: '頑張ります / させていただきます / 〜的な感じ',
    written_at: '2026-04-28T03:18:00Z',
  },
];

// ---- 行整形 ----
const row = buildRow({
  diag,
  celestial,
  scores,
  narratives,
  reportUrl: 'https://dna-shindan-ai.vercel.app/r/sample-uuid-aaaa-1111',
  cloneUrl: 'https://dna-shindan-ai.vercel.app/clone/sample-uuid-aaaa-1111',
  emailOpenedAt: '2026-04-28T04:00:00Z',
});

// 配列形式 (Sheets API に渡す形)
const valuesArray = SHEET_COLUMN_ORDER.map((k) => row[k] ?? '');

// ---- 検証 ----
const checks: { name: string; ok: boolean; detail?: string }[] = [];
checks.push({
  name: '列数一致',
  ok: valuesArray.length === EXPECTED_COLUMN_COUNT,
  detail: `${valuesArray.length} / ${EXPECTED_COLUMN_COUNT}`,
});
checks.push({
  name: 'A列(timestamp)が空でない',
  ok: !!row.A_timestamp,
});
checks.push({
  name: 'B列(userId)が一致',
  ok: row.B_userId === diag.id,
});
checks.push({
  name: 'I列(四柱日柱)に "甲子" が入っている',
  ok: row.I_shichuu_dayPillar === '甲子',
  detail: row.I_shichuu_dayPillar,
});
checks.push({
  name: 'J列(九星)に "二黒土星" が入っている',
  ok: row.J_kyusei_main === '二黒土星',
  detail: row.J_kyusei_main,
});
checks.push({
  name: 'K列(数秘ライフパス) = 22',
  ok: String(row.K_numerology_lifePath) === '22',
  detail: row.K_numerology_lifePath,
});
checks.push({
  name: 'Y列(Big5)に "O=88" が含まれる',
  ok: row.Y_big5.includes('O=88'),
  detail: row.Y_big5,
});
checks.push({
  name: 'AC列(エニア主タイプ)が空でない',
  ok: !!row.AC_enneagram_main,
  detail: row.AC_enneagram_main,
});
checks.push({
  name: 'AF列(夢中体験)が引用されている',
  ok: row.AF_n1_dream.includes('ホワイトボード'),
});
checks.push({
  name: 'AO列(統合タグ)に "触媒" が含まれる',
  ok: row.AO_tags.includes('触媒'),
  detail: row.AO_tags,
});
checks.push({
  name: 'AP列(PDFレポートURL)が公開URL',
  ok: row.AP_pdfUrl.startsWith('https://'),
});
checks.push({
  name: 'AR列(開封フラグ) = "opened"',
  ok: row.AR_emailOpened === 'opened',
});
checks.push({
  name: 'AS列(LP流入経路) = "twitter_organic"',
  ok: row.AS_lpSource === 'twitter_organic',
});

// ---- 出力 ----
const out = {
  meta: {
    generatedAt: new Date().toISOString(),
    expectedColumnCount: EXPECTED_COLUMN_COUNT,
    actualColumnCount: valuesArray.length,
    columnOrder: SHEET_COLUMN_ORDER,
  },
  rowObject: row,
  rowArray: valuesArray,
  checks,
};

writeFileSync(
  path.join(SCRIPTS_DIR, 'sample-sheet-row.json'),
  JSON.stringify(out, null, 2),
  'utf8',
);

// ---- ログ ----
console.log('スプシ行整形テスト結果:');
console.log(`  列数: ${valuesArray.length} / ${EXPECTED_COLUMN_COUNT}`);
console.log('  チェック:');
for (const c of checks) {
  console.log(`    ${c.ok ? 'OK ' : 'NG '} ${c.name}${c.detail ? ` (${c.detail})` : ''}`);
}
const passed = checks.filter((c) => c.ok).length;
console.log(`  合計: ${passed} / ${checks.length} PASS`);
console.log('');
console.log(`生成ファイル: ${path.join(SCRIPTS_DIR, 'sample-sheet-row.json')}`);
