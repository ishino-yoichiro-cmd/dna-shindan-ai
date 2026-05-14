/**
 * 不変条件リグレッションテスト（純粋関数のみ・API不使用）
 *
 * 【目的】「以前できていたこと」をコード契約として記述し、毎deploy前に必須通過させる。
 *
 * 【背景】2026-05-14 YO 指示：「何を開発しても何を作っても、毎回行ったり来たりで、
 *   あっちをつくればこっちが壊れ、が繰り返され続けて不毛に時間とコストを奪われ続けている」
 * → AI を変えても解決しない。**コードに動作契約**を書き、物理ゲートで縛るのが唯一の解。
 *
 * 【ルール】
 * 1. 新機能を追加するたびに、その不変条件を test() で追加する
 * 2. 既存の test() を弱める方向の変更は禁止（YO 明示承認時のみ）
 * 3. 全件 PASS しないと deploy できない（verify-deploy-ready.sh Phase 0.7）
 *
 * 【実行】node lib/__tests__/invariants.test.mjs
 * 【失敗時】exit code 1 で deploy block
 */

import assert from "node:assert/strict";

let failed = 0;
let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    failures.push({ name, msg: e.message });
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
  }
}

// =============================================
// このプロダクトの不変条件を以下に追加していく。
// 例：
// =============================================

console.log("\n=== 例：基本動作 ===");

test("プロダクト固有の不変条件1（要編集）", () => {
  // 例：URL parser が想定通り動く
  assert.equal(1 + 1, 2);
});

test("プロダクト固有の不変条件2（要編集）", () => {
  // 例：日付フォーマッタが ISO 8601 を維持
  assert.ok(true);
});

// =============================================
// 結果サマリ（変更不要）
// =============================================
console.log(`\n${"=".repeat(50)}`);
console.log(`✅ PASS: ${passed}  ❌ FAIL: ${failed}`);
console.log("=".repeat(50));
if (failed > 0) {
  console.log("\n失敗詳細:");
  failures.forEach((f) => console.log(`  - ${f.name}: ${f.msg}`));
  process.exit(1);
}
process.exit(0);
