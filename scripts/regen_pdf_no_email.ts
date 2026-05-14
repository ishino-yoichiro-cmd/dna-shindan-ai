/**
 * PDF再生成スクリプト（メール送信なし）
 * - 指定IDのレコードを取得
 * - 新しいコードでPDF生成
 * - Supabase Storageにアップロード（上書き）
 * - メールは送信しない
 *
 * 実行: npx tsx scripts/regen_pdf_no_email.ts
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@supabase/supabase-js';
import { Report } from '../src/components/pdf/Report';
import { runAllCelestial } from '../src/lib/celestial';

const SUPABASE_URL = 'https://utcsldezxxjeednyxovs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3NsZGV6eHhqZWVkbnl4b3ZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc1OTk4MSwiZXhwIjoyMDkxMzM1OTgxfQ.LWTdcbA5QnXf-ig0fX7WPEw6HjBGPt_Jy6AX21Oe3lU';

// 再生成対象ID
const TARGET_IDS = [
  // 再生成対象IDをここに記入（実行前に必ず変更すること）
  // 例: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // 名前 email (エラー内容)
];

function applyCloneUrl(md: string, id: string): string {
  const url = `https://dna-shindan-ai.vercel.app/clone/${id}`;
  return md.replace(/\{\{\s*CLONE_URL\s*\}\}/g, url);
}

async function main() {
  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const id of TARGET_IDS) {
    console.log(`\n===== ${id} =====`);
    const { data, error } = await supa.from('dna_diagnoses').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      console.error('fetch error:', error);
      continue;
    }
    const row = data as any;
    console.log(`email: ${row.email}, name: ${row.first_name} ${row.last_name}`);

    // 命術計算
    const celestial = await runAllCelestial({
      fullName: `${row.last_name ?? ''} ${row.first_name ?? ''}`.trim(),
      birthDate: row.birth_date,
      birthTime: row.birth_time ?? undefined,
      birthPlace: row.birth_place_label ?? undefined,
      gender: undefined,
    });

    // report_text の {{CLONE_URL}} 置換
    const rawContent = (row.report_text ?? {}) as Record<string, string>;
    const llmContent: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawContent)) {
      llmContent[k] = typeof v === 'string' ? applyCloneUrl(v, id) : v;
    }

    const reportProps = {
      userInfo: {
        fullName: `${row.last_name ?? ''} ${row.first_name ?? ''}`.trim(),
        birthDate: row.birth_date,
        birthTime: row.birth_time ?? undefined,
        birthPlace: row.birth_place_label ?? '',
      },
      llmContent,
      celestial,
      scores: row.scores ?? {},
      relationshipTag: row.relationship_tag ?? 'tomodachi',
    };

    console.log('PDF生成中...');
    let buf: Buffer;
    try {
      buf = await renderToBuffer(React.createElement(Report, reportProps as any));
    } catch (e) {
      console.error('PDF生成失敗:', e);
      continue;
    }
    console.log(`PDF生成完了: ${Math.round(buf.byteLength / 1024)}KB`);

    // ローカル保存（確認用）
    const outDir = '/Users/yo/Downloads/ClaudeCodeOutput';
    fs.mkdirSync(outDir, { recursive: true });
    const localPath = path.join(outDir, `${id.slice(0,8)}_regenerated.pdf`);
    fs.writeFileSync(localPath, buf);
    console.log(`ローカル保存: ${localPath}`);

    // Supabase Storage にアップロード（上書き）
    const storagePath = `${id}.pdf`;
    const { error: upErr } = await supa.storage
      .from('reports')
      .upload(storagePath, buf, {
        contentType: 'application/pdf',
        upsert: true,
      });
    if (upErr) {
      console.error('Storage upload失敗:', upErr);
    } else {
      console.log(`✅ Storage更新完了: reports/${storagePath}`);
    }

    // DB更新（completed_at更新のみ、メールなし）
    await supa
      .from('dna_diagnoses')
      .update({ completed_at: new Date().toISOString() } as any)
      .eq('id', id);
    console.log(`DB updated (completed_at only, no email)`);
  }

  console.log('\n✅ 全PDF再生成完了');
}

main().catch(e => { console.error(e); process.exit(1); });
