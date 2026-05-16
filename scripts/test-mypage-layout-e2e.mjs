#!/usr/bin/env node
// E2E: /api/mypage-layout（公開GET）の最低保証
// 使い方: TEST_BASE_URL=https://dna-shindan-ai.vercel.app node scripts/test-mypage-layout-e2e.mjs
// （ローカル時は BASE_URL=http://localhost:3000 でも可）

const BASE = process.env.TEST_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
const fail = (m) => { console.error('❌', m); process.exit(1); };
const ok = (m) => console.log('✅', m);

const r = await fetch(`${BASE}/api/mypage-layout`);
if (r.status !== 200) fail(`status ${r.status}`);
const d = await r.json();
if (!d.ok) fail(`ok=false: ${JSON.stringify(d)}`);
if (!d.layout) fail(`layout missing`);
const lo = d.layout;
const required = ['header', 'intro', 'announcement', 'sections', 'footer'];
for (const k of required) if (!(k in lo)) fail(`missing key: ${k}`);
if (!Array.isArray(lo.sections) || lo.sections.length === 0) fail(`sections array empty`);
const cache = r.headers.get('cache-control') ?? '';
if (!cache.includes('max-age')) fail(`Cache-Control missing max-age: "${cache}"`);
ok(`public layout ok (${lo.sections.length} sections, cache="${cache}")`);
console.log('=== PASS ===');
