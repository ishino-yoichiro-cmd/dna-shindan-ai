// 各質問のスコア軸寄与を集計し、18問選定（各軸最低3問でカバー）
import { SELECT_QUESTIONS, type SelectQuestion } from '../src/data/questions';

interface QStats {
  id: string;
  axesHit: Set<string>;     // この問が動かす軸の集合
  totalAbsDelta: number;    // 絶対値合計（強度）
}

function flattenDelta(delta: Record<string, unknown> | undefined): Array<[string, number]> {
  if (!delta) return [];
  const out: Array<[string, number]> = [];
  for (const [k, v] of Object.entries(delta)) {
    if (typeof v === 'number') {
      out.push([k, v]);
    } else if (v && typeof v === 'object') {
      // ネスト構造（big5: {O:1,C:2}）に対応
      for (const [kk, vv] of Object.entries(v as Record<string, unknown>)) {
        if (typeof vv === 'number') out.push([`${k}.${kk}`, vv]);
      }
    }
  }
  return out;
}

const stats: QStats[] = [];

for (const q of SELECT_QUESTIONS as SelectQuestion[]) {
  const axes = new Set<string>();
  let total = 0;
  for (const c of q.choices) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delta = (c as any).scoreDelta ?? (c as any).delta;
    for (const [axis, val] of flattenDelta(delta)) {
      axes.add(axis);
      total += Math.abs(val);
    }
  }
  stats.push({ id: q.id, axesHit: axes, totalAbsDelta: total });
}

console.log(`[全${stats.length}問]`);
console.log('各問の軸カバー数とデルタ強度:');
for (const s of stats) {
  console.log(`  ${s.id}: 軸数=${s.axesHit.size}, 強度=${s.totalAbsDelta.toFixed(1)}`);
}

// 全軸を取得
const allAxes = new Set<string>();
for (const s of stats) for (const a of s.axesHit) allAxes.add(a);
console.log(`\n[全軸数: ${allAxes.size}]`);

// グリーディ選定：各軸が最低3回カバーされるまで貢献度高い順に選ぶ
const TARGET_PER_AXIS = 3;
const TARGET_COUNT = 18;
const axisCount: Record<string, number> = {};
for (const a of allAxes) axisCount[a] = 0;

const selected: string[] = [];
const remaining = [...stats];

while (selected.length < TARGET_COUNT && remaining.length > 0) {
  // 各候補のスコア = (まだ目標未到達の軸を新たにカバーする数) * 10 + 強度
  let bestIdx = -1;
  let bestScore = -1;
  for (let i = 0; i < remaining.length; i++) {
    const r = remaining[i];
    let coverGain = 0;
    for (const a of r.axesHit) {
      if (axisCount[a] < TARGET_PER_AXIS) coverGain++;
    }
    const score = coverGain * 100 + r.totalAbsDelta;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) break;
  const picked = remaining.splice(bestIdx, 1)[0];
  selected.push(picked.id);
  for (const a of picked.axesHit) axisCount[a]++;
}

console.log(`\n[選定 ${selected.length}問]`);
const sortedSel = [...selected].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
console.log('  ' + sortedSel.join(', '));

console.log('\n[各軸のカバー数（最終）]');
for (const a of [...allAxes].sort()) {
  const c = axisCount[a];
  const ok = c >= TARGET_PER_AXIS ? '✓' : '✗';
  console.log(`  ${ok} ${a}: ${c}問`);
}

// types.ts 用の SELECT_STEP_QIDS 配列
console.log('\n=== types.ts 貼り付け用 ===');
console.log(`export const SELECT_STEP_QIDS = [${sortedSel.map(s => `'${s}'`).join(', ')}] as const;`);
