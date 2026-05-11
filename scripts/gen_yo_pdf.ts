import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@supabase/supabase-js';
import { Report } from '../src/components/pdf/Report';
import { runAllCelestial } from '../src/lib/celestial';

const DIAG_ID = '83d343e0-8638-4d34-a082-90b2960e019b';

async function main() {
  const supa = createClient(
    'https://utcsldezxxjeednyxovs.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y3NsZGV6eHhqZWVkbnl4b3ZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc1OTk4MSwiZXhwIjoyMDkxMzM1OTgxfQ.LWTdcbA5QnXf-ig0fX7WPEw6HjBGPt_Jy6AX21Oe3lU',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supa.from('dna_diagnoses').select('*').eq('id', DIAG_ID).maybeSingle();
  if (error || !data) { console.error('fetch error', error); process.exit(1); }
  const row = data as any;

  const celestial = await runAllCelestial({
    fullName: row.full_name,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    birthPlace: row.birth_place ?? undefined,
    gender: row.gender ?? undefined,
  });

  const reportProps = {
    userInfo: {
      fullName: row.full_name,
      birthDate: row.birth_date,
      birthTime: row.birth_time ?? undefined,
      birthPlace: row.birth_place_text ?? '',
    },
    llmContent: row.report_text as any,
    celestial,
    scores: {} as any,
    relationshipTag: 'マブダチ' as any,
  };

  console.log('PDF生成中...');
  const buf = await renderToBuffer(React.createElement(Report, reportProps as any));
  const outPath = '/Users/yo/Downloads/ClaudeCodeOutput/yo_report_local_test.pdf';
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log('✅ 保存:', outPath, Math.round(buf.byteLength / 1024) + 'KB');
}

main().catch(e => { console.error(e); process.exit(1); });
