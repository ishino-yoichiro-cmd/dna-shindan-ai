#!/usr/bin/env node
// E2E: /api/admin/mypage-layout の GET/PATCH の round-trip
// 使い方: BASE_URL=http://localhost:3300 ADMIN_PASSWORD=xxx node scripts/test-admin-mypage-layout-e2e.mjs
// 環境変数が無ければ .env.local から自動ロード

import { readFileSync } from 'node:fs';

function loadEnv(path) {
  try {
    const txt = readFileSync(path, 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {}
}
loadEnv(new URL('../.env.local', import.meta.url).pathname);

const BASE = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
const PASS = process.env.ADMIN_PASSWORD;
if (!PASS) { console.error('ADMIN_PASSWORD 未設定'); process.exit(2); }

const fail = (msg) => { console.error('❌', msg); process.exit(1); };
const ok = (msg) => console.log('✅', msg);

// 1. 認証なしは 401（404ならendpoint未デプロイ＝pre-push過渡期としてスキップ）
{
  const r = await fetch(`${BASE}/api/admin/mypage-layout?pass=invalid`);
  if (r.status === 404) {
    console.warn(`⚠️  ${BASE}/api/admin/mypage-layout が 404 — まだデプロイ未反映の可能性。pre-push段階ではスキップ`);
    process.exit(0);
  }
  if (r.status !== 401) fail(`auth gate: expected 401, got ${r.status}`);
  ok('auth gate (401 on invalid pass)');
}

// 2. GET: 現状取得
let original;
{
  const r = await fetch(`${BASE}/api/admin/mypage-layout?pass=${encodeURIComponent(PASS)}`);
  if (r.status !== 200) fail(`GET status: ${r.status}`);
  const d = await r.json();
  if (!d.ok || !d.layout?.sections) fail(`GET shape: ${JSON.stringify(d).slice(0,200)}`);
  original = d.layout;
  ok(`GET ok (${original.sections.length} sections)`);
}

// 3. PATCH: 試験的に footer.note を上書き
const probe = `__e2e_${Date.now()}__`;
const draft = { ...original, footer: { note: probe } };
{
  const r = await fetch(`${BASE}/api/admin/mypage-layout`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pass: PASS, layout: draft }),
  });
  if (r.status !== 200) fail(`PATCH status: ${r.status}`);
  const d = await r.json();
  if (!d.ok) fail(`PATCH not ok: ${JSON.stringify(d)}`);
  if (d.layout.footer.note !== probe) fail(`PATCH footer mismatch: ${d.layout.footer.note}`);
  ok('PATCH applied (footer.note round-trip)');
}

// 4. 公開GETでも反映確認（CDNキャッシュ回避のため cache-bust 付き）
{
  const r = await fetch(`${BASE}/api/mypage-layout?_cb=${Date.now()}`, { cache: 'no-store' });
  if (r.status !== 200) fail(`public GET status: ${r.status}`);
  const d = await r.json();
  if (d.layout.footer.note !== probe) fail(`public GET footer mismatch: ${d.layout.footer.note}`);
  ok('public GET reflects change');
}

// 5. 元に戻す
{
  const r = await fetch(`${BASE}/api/admin/mypage-layout`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pass: PASS, layout: original }),
  });
  if (r.status !== 200) fail(`restore status: ${r.status}`);
  ok('restored original');
}

console.log('\n=== ALL PASS ===');
