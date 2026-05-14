#!/usr/bin/env node
/**
 * E2E: /api/admin/send-mail
 *
 * 検証項目:
 * 1. 認証失敗（パスワード不正）→ 401
 * 2. confirm:true なし一括送信 → 400
 * 3. targetCount 不一致 → 400
 * 4. 個別送信（1件）→ sent:1 / failed:0 — 実際にメール到達まで確認
 * 5. 空配列送信 → sent:0（送信ゼロ）
 *
 * 実際のメール送信はYOのGmailアカウント（yoisno@gmail.com）のみ。
 * 他の実ユーザーには一切送信しない。
 */

import assert from 'assert';

const BASE = process.env.TEST_BASE_URL ?? 'https://dna.kami-ai.jp';
const PASS = process.env.ADMIN_PASSWORD;
const SELF_ID = process.env.E2E_ADMIN_SELF_ID; // yoisno@gmail.com の diagnoses ID

if (!PASS) {
  console.error('❌ ADMIN_PASSWORD 未設定');
  process.exit(1);
}
if (!SELF_ID) {
  console.error('❌ E2E_ADMIN_SELF_ID 未設定（yoisno@gmail.comのdiagnoses IDを設定）');
  process.exit(1);
}

let passed = 0;
let failed = 0;

async function post(body) {
  const r = await fetch(`${BASE}/api/admin/send-mail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('\n🧪 /api/admin/send-mail E2E\n');

// 1. 認証失敗
await test('認証失敗（不正パス）→ 401', async () => {
  const { status } = await post({ pass: 'wrong-pass', to: [], subject: 'test', body: 'test' });
  assert.strictEqual(status, 401, `status=${status}`);
});

// 2. confirm なし一括送信 → 400
await test('confirm:true なし一括送信 → 400', async () => {
  const { status, body } = await post({ pass: PASS, to: 'completed', subject: 'test', body: 'test' });
  assert.strictEqual(status, 400, `status=${status}`);
  assert.ok(body.requireConfirm, 'requireConfirm フラグなし');
});

// 3. targetCount 不一致 → 400
await test('targetCount 不一致 → 400', async () => {
  const { status, body } = await post({
    pass: PASS, to: 'completed', subject: 'test', body: 'test',
    confirm: true, targetCount: 999999,
  });
  assert.strictEqual(status, 400, `status=${status}`);
  assert.ok(body.actualCount !== undefined, 'actualCount が返っていない');
  assert.ok(body.actualCount !== 999999, 'actualCount が一致してしまった');
});

// 4. 空配列 → sent:0
await test('空配列送信 → sent:0', async () => {
  const { status, body } = await post({ pass: PASS, to: [], subject: 'test', body: 'test' });
  assert.strictEqual(status, 200, `status=${status}`);
  assert.strictEqual(body.sent, 0, `sent=${body.sent}`);
});

// 5. 個別送信（自分のみ）→ sent:1
await test(`個別送信 → sent:1 (${SELF_ID.slice(0, 8)}…)`, async () => {
  const { status, body } = await post({
    pass: PASS,
    to: [SELF_ID],
    subject: '【E2Eテスト】管理画面メール送信確認',
    body: 'これはE2Eテストによる自動送信です。yoisno@gmail.comのみに届いています。',
  });
  assert.strictEqual(status, 200, `status=${status}`);
  assert.strictEqual(body.sent, 1, `sent=${body.sent} (expected 1)`);
  assert.strictEqual(body.failed, 0, `failed=${body.failed} (expected 0)`);
  assert.strictEqual(body.total, 1, `total=${body.total}`);
});

console.log(`\n結果: ${passed}件 PASS / ${failed}件 FAIL\n`);
if (failed > 0) process.exit(1);
