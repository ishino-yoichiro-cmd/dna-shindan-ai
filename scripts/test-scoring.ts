// スコアリングエンジン動作確認スクリプト
// 3パターン（外向型・内向型・ランダム）で実行し sample-scoring-output.json に保存

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runScoringFromAnswers } from '../src/lib/scoring';
import { SELECT_QUESTIONS } from '../src/data/questions';

// ==========
// パターン1：外向型（E高・A高・社交志向）
// E/A/外向の選択肢を意識的に選ぶ
// ==========
const EXTRA_ANSWERS: Record<string, string> = {
  Q5: 'A',  // 友達と急に集まって
  Q6: 'A',  // みんなに投票してもらう
  Q7: 'C',  // 友達のおすすめ
  Q8: 'A',  // 真ん中
  Q9: 'C',  // 過去の人に話を聞く
  Q10: 'C', // YouTube動画見ながら
  Q11: 'A', // 友達に電話
  Q12: 'A', // ワクワクする
  Q13: 'C', // ハグしたり
  Q14: 'A', // SNSチェック
  Q15: 'D', // 社会・歴史
  Q16: 'D', // ホテルだけ取って任せる
  Q17: 'B', // 統合案
  Q18: 'C', // 弱者を見下す人
  Q19: 'C', // 信頼できる人に囲まれて
  Q20: 'B', // 近くの人に話しかける
  Q21: 'A', // 大事な人が傷つけられた
  Q22: 'E', // 大切な人へのプレゼント
  Q23: 'C', // マンツーマン
  Q24: 'B', // 話を最後まで聞いてくれる
  Q25: 'A', // その場で話し合う
  Q26: 'C', // モチベを保つ
  Q27: 'B', // 周囲への申し訳なさ
  Q28: 'D', // 一人1：人と9
  Q29: 'D', // 関係性の質
  Q30: 'E', // 教室・コーチング
};

// ==========
// パターン2：内向型（I高・O高・思索志向）
// I/N/思索系の選択肢を意識的に選ぶ
// ==========
const INTRO_ANSWERS: Record<string, string> = {
  Q5: 'B',  // 一人で本やNetflix
  Q6: 'C',  // 食べログ調べて
  Q7: 'B',  // レビュー全部読む
  Q8: 'B',  // 端っこ
  Q9: 'B',  // ググって類似事例
  Q10: 'A', // 説明書を最初から読む
  Q11: 'C', // 音楽・映画・本に没入
  Q12: 'C', // 何か悪いこと書かれてないか
  Q13: 'B', // 手紙やメッセージ
  Q14: 'B', // タスク整理
  Q15: 'A', // 数学・物理
  Q16: 'A', // スプシで完璧に
  Q17: 'C', // 黙って観察
  Q18: 'B', // 表面的で本音を見せない人
  Q19: 'D', // 世の中に意味あること
  Q20: 'A', // 紙の地図を読み解く
  Q21: 'C', // 領域を侵された
  Q22: 'C', // 自分への投資
  Q23: 'A', // 本や教科書
  Q24: 'D', // 弱さも見せてくれる対等な関係
  Q25: 'B', // 一旦距離を取る
  Q26: 'D', // 専門スキルで難しいパートを
  Q27: 'D', // 解決モード
  Q28: 'A', // 一人7：人と3
  Q29: 'A', // 仕事のクオリティ
  Q30: 'F', // 投資・データ分析
};

// ==========
// パターン3：ランダム（決定論的シード使用）
// ==========
function seededRandom(seed: number): () => number {
  // 簡易LCG
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

function randomAnswers(seed: number): Record<string, string> {
  const rand = seededRandom(seed);
  const ans: Record<string, string> = {};
  for (const q of SELECT_QUESTIONS) {
    const idx = Math.floor(rand() * q.choices.length);
    ans[q.id] = q.choices[idx].id;
  }
  return ans;
}

// 実行
const patterns = {
  extrovert: {
    label: '外向型（E高・社交志向）',
    answers: EXTRA_ANSWERS,
    result: runScoringFromAnswers(EXTRA_ANSWERS),
  },
  introvert: {
    label: '内向型（I高・思索志向）',
    answers: INTRO_ANSWERS,
    result: runScoringFromAnswers(INTRO_ANSWERS),
  },
  random: {
    label: 'ランダム（seed=42）',
    answers: randomAnswers(42),
    result: runScoringFromAnswers(randomAnswers(42)),
  },
};

const output = {
  generatedAt: new Date().toISOString(),
  totalQuestions: SELECT_QUESTIONS.length,
  patterns,
};

const outputPath = join(__dirname, 'sample-scoring-output.json');
writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

// サマリー出力
console.log('=== スコアリングエンジン動作確認 ===\n');
for (const [key, pat] of Object.entries(patterns)) {
  console.log(`\n--- ${key}: ${pat.label} ---`);
  console.log(`回答数: ${pat.result.meta.answeredCount}/${pat.result.meta.totalSelectQuestions}`);
  console.log(`MBTI: ${pat.result.topTypes.mbti.type}`);
  console.log(
    `エニア: ${pat.result.topTypes.ennea.expression} (${pat.result.topTypes.ennea.main.name})`
  );
  console.log(
    `起業家: ${pat.result.topTypes.entre.main.name}(${pat.result.topTypes.entre.main.subtitle}) / sub: ${pat.result.topTypes.entre.sub.name}`
  );
  console.log(
    `Big5派生: ${pat.result.topTypes.big5DerivedType.code} = ${pat.result.topTypes.big5DerivedType.label}`
  );
  console.log(
    `RIASEC top3: ${pat.result.topTypes.riasecTop3.map((r) => r.code).join('/')}`
  );
  console.log(
    `VAK: ${pat.result.topTypes.vakTop.code} / アタッチ: ${pat.result.topTypes.attachTop.code} / 愛情: ${pat.result.topTypes.loveTop.code}`
  );
}

console.log(`\n出力先: ${outputPath}`);
