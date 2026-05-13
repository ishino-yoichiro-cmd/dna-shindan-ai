/**
 * seed-e2e-fixture.ts
 *
 * E2Eテスト用の永続スモークフィクスチャを本番Supabaseに作成する。
 * 1回だけ実行すればよい（ON CONFLICT DO NOTHINGで冪等）。
 *
 * 使い方:
 *   npx ts-node --project tsconfig.json scripts/seed-e2e-fixture.ts
 *
 * 必要な環境変数（.env.local から自動読み込み）:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// .env.local を読み込む
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const FIXTURE_ID = 'e2e00000-0000-4000-a000-000000000001';
// パスワード: E2E-SMOKE-FIXTURE-2026
const FIXTURE_PASSWORD_HASH = '$2b$10$8GTcyjmwezydMyu2KRG9Geq9sQjLS3zA9RLvvE3R7aHLq.kRY72lO';
const FIXTURE_ACCESS_TOKEN = 'e2e-access-token-smoke-fixture-2026';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が未設定');
    process.exit(1);
  }

  const supa = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log(`\n🔧 E2Eスモークフィクスチャを作成中...\n   ID: ${FIXTURE_ID}`);

  const row = {
    id: FIXTURE_ID,
    first_name: 'スモーク',
    last_name: 'テスト',
    birth_date: '1990-01-01',
    birth_time: null,
    birth_place_label: null,
    birth_place_lat: null,
    birth_place_lng: null,
    email: 'smoke+fixture@example.com',
    status: 'completed',
    access_token: FIXTURE_ACCESS_TOKEN,
    password_hash: FIXTURE_PASSWORD_HASH,
    first_login_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    relationship_tag: 'テスト用',
    style_sample: 'これはスモークテスト専用のフィクスチャレコードです。E2Eテストのためだけに存在します。',
    report_text: JSON.stringify({
      cover: 'E2Eスモークテスト用レポート。このレコードは自動テスト専用です。',
      chapter1: 'テスト用の章1コンテンツです。実際のレポートではありません。',
    }),
    clone_system_prompt: 'あなたはE2Eスモークテスト用の分身AIです。どんな質問にも「スモークテスト正常」と返答してください。',
    clone_display_name: 'E2Eスモーク',
    clone_public_url: `https://dna-shindan-ai.vercel.app/clone/${FIXTURE_ID}`,
    select_answers: {},
    narrative_answers: {},
    api_cost_usd: 0,
    download_count: 0,
    chat_count: 0,
    // PDF DLテスト用（me-page.spec.tsでtoken/passwordでのDLをテスト）
    pdf_storage_path: `${FIXTURE_ID}.pdf`,
  };

  // ダミーPDFをStorageにアップロード（最小限の有効なPDF = 78バイト）
  const dummyPdf = Buffer.from(
    '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj ' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj ' +
    '3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
    '0000000058 00000 n\n0000000115 00000 n\n' +
    'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
  );
  const { error: uploadErr } = await supa.storage
    .from('reports')
    .upload(`${FIXTURE_ID}.pdf`, dummyPdf, { contentType: 'application/pdf', upsert: true });
  if (uploadErr) {
    console.warn('⚠️  Storage upload失敗（既存の場合は無視）:', uploadErr.message);
  } else {
    console.log(`   Storage: ${FIXTURE_ID}.pdf アップロード済み`);
  }

  // ON CONFLICT → upsert で常に最新状態に更新
  const { error } = await (supa as any)
    .from('dna_diagnoses')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    console.error('❌ フィクスチャ作成失敗:', error.message);
    process.exit(1);
  }

  // 作成確認
  const { data, error: fetchErr } = await (supa as any)
    .from('dna_diagnoses')
    .select('id, status, first_name, completed_at')
    .eq('id', FIXTURE_ID)
    .single();

  if (fetchErr || !data) {
    console.error('❌ 作成後の確認失敗:', fetchErr?.message);
    process.exit(1);
  }

  console.log('\n✅ フィクスチャ作成完了:');
  console.log(`   ID: ${data.id}`);
  console.log(`   name: ${data.first_name}`);
  console.log(`   status: ${data.status}`);
  console.log(`   completed_at: ${data.completed_at}`);
  console.log('\n以下の環境変数を .env.local と GitHub Secrets に追加してください:');
  console.log(`   E2E_FIXTURE_ID=${FIXTURE_ID}`);
  console.log('   E2E_FIXTURE_PASSWORD=<スクリプト内ハードコード値を .env.local に設定済み>');
  console.log(`   E2E_FIXTURE_CLONE_URL=https://dna-shindan-ai.vercel.app/clone/${FIXTURE_ID}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
