/**
 * DNA診断AI — メールテンプレ生成テスト
 *
 * 実送信は行わない (RESEND_API_KEY 不要)。
 * ダミーの diagnosis データから HTML / text を生成し、
 * scripts/sample-email.html / scripts/sample-email.txt に書き出す。
 *
 * 進捗中断リマインダーも同時に生成。
 *
 * 実行: pnpm tsx scripts/test-email-template.ts
 *       npx tsx scripts/test-email-template.ts
 */

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  renderCompletedReportEmail,
  renderProgressReminderEmail,
} from '../src/lib/email/templates';
import { RELATIONSHIP_TAGS } from '../src/lib/supabase/database.types';

const SCRIPTS_DIR = path.dirname(new URL(import.meta.url).pathname);

// ---- 完了通知メール (関係性タグ別 全8パターン) ----
const completedSamples = RELATIONSHIP_TAGS.map((tag) =>
  renderCompletedReportEmail({
    fullName: 'サンプル ユーザー',
    relationshipTag: tag,
    reportUrl: 'https://dna-shindan-ai.vercel.app/r/sample-uuid-1234',
    cloneUrl: 'https://dna-shindan-ai.vercel.app/clone/sample-uuid-1234',
    summaryKeywords: [
      '触媒',
      '構造設計',
      '本質直視',
      '即決即動',
      '俯瞰',
      '言語化',
    ],
  }),
);

// 代表として「マブダチ」版を sample-email.html / sample-email.txt に書く
const main = completedSamples[0];
writeFileSync(
  path.join(SCRIPTS_DIR, 'sample-email.html'),
  main.html,
  'utf8',
);
writeFileSync(
  path.join(SCRIPTS_DIR, 'sample-email.txt'),
  `件名: ${main.subject}\n\n${main.text}`,
  'utf8',
);

// 全8パターンを sample-email-by-tag.json に
writeFileSync(
  path.join(SCRIPTS_DIR, 'sample-email-by-tag.json'),
  JSON.stringify(
    completedSamples.map((s, i) => ({
      relationshipTag: RELATIONSHIP_TAGS[i],
      subject: s.subject,
      htmlPreview: s.html.slice(0, 240) + '...',
      text: s.text,
    })),
    null,
    2,
  ),
  'utf8',
);

// ---- 進捗中断リマインダー ----
const reminder = renderProgressReminderEmail({
  fullName: 'サンプル ユーザー',
  resumeUrl: 'https://dna-shindan-ai.vercel.app/diagnose/resume?id=sample',
  lastStep: 18,
  totalSteps: 40,
});

writeFileSync(
  path.join(SCRIPTS_DIR, 'sample-reminder-email.html'),
  reminder.html,
  'utf8',
);
writeFileSync(
  path.join(SCRIPTS_DIR, 'sample-reminder-email.txt'),
  `件名: ${reminder.subject}\n\n${reminder.text}`,
  'utf8',
);

// ---- ログ ----
console.log('完了通知メール:');
console.log(`  件名: ${main.subject}`);
console.log(`  HTML長: ${main.html.length} chars`);
console.log(`  テキスト長: ${main.text.length} chars`);
console.log(`  関係性タグ別: ${completedSamples.length}パターン生成`);
console.log('');
console.log('進捗リマインダーメール:');
console.log(`  件名: ${reminder.subject}`);
console.log(`  HTML長: ${reminder.html.length} chars`);
console.log('');
console.log('生成ファイル:');
console.log(`  ${path.join(SCRIPTS_DIR, 'sample-email.html')}`);
console.log(`  ${path.join(SCRIPTS_DIR, 'sample-email.txt')}`);
console.log(`  ${path.join(SCRIPTS_DIR, 'sample-email-by-tag.json')}`);
console.log(`  ${path.join(SCRIPTS_DIR, 'sample-reminder-email.html')}`);
console.log(`  ${path.join(SCRIPTS_DIR, 'sample-reminder-email.txt')}`);
