// 試作PDF生成スクリプト
// ダミーデータで全13章のPDFを生成し scripts/sample-report.pdf に出力
// 実行：npx tsx scripts/generate-sample-pdf.ts

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToFile, renderToBuffer } from '@react-pdf/renderer';
import { Report } from '../src/components/pdf/Report';
import { runAllCelestial } from '../src/lib/celestial';
import type { ReportProps } from '../src/components/pdf/types';
import type { CelestialInput } from '../src/lib/celestial';

async function main() {
  const sampleInput: CelestialInput = {
    fullName: '山田 太郎',
    birthDate: '1985-05-15',
    birthTime: '14:30',
    birthPlace: {
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: 'Asia/Tokyo',
    },
    gender: 'male',
  };

  console.log('[1/3] 命術16計算中...');
  const celestial = await runAllCelestial(sampleInput);
  console.log(
    `   成功 ${celestial.meta.successCount} / 失敗 ${celestial.meta.failureCount} / ${celestial.meta.durationMs}ms`,
  );

  const props: ReportProps = {
    celestial,
    scores: {
      bigFive: { O: 78, C: 65, E: 42, A: 70, N: 38 },
      bigFiveType: '深掘り型探究家',
      enneagram: { primary: 5, wing: 4 },
      riasec: {
        R: 25, I: 80, A: 72, S: 55, E: 48, C: 58,
        top3: ['I（探究）', 'A（芸術）', 'C（慣習）'],
      },
      vak: { V: 42, A: 28, K: 30 },
      attachment: 'secure',
      loveLanguage: { time: 35, words: 15, touch: 15, gifts: 10, acts: 25 },
      entrepreneur: { primary: '構築家タイプ', secondary: '探究家タイプ' },
    },
    llmContent: {}, // 全章フォールバックを使う（Phase 2-Cで実LLM統合）
    userInfo: {
      fullName: '山田 太郎',
      birthDate: '1985-05-15',
      birthTime: '14:30',
      birthPlace: '東京都',
      email: 'sample@example.com',
      styleSample:
        '何かを書こうとするとき、いつも入口で迷う。書きたいことは決まっているのに、最初の一行が浮かばない。それでも数分置いてから戻ると、不思議と最初の一文がするりと出てくる。',
      ngExpressions: ['意識高い系の言葉', '断定すぎる占い口調'],
    },
    relationshipTag: 'マブダチ',
  };

  const outDir = path.join(process.cwd(), 'scripts');
  const outPath = path.join(outDir, 'sample-report.pdf');

  console.log('[2/3] PDFレンダリング中...');
  const buffer = await renderToBuffer(React.createElement(Report, props));
  fs.writeFileSync(outPath, buffer);

  const stat = fs.statSync(outPath);
  const sizeKb = (stat.size / 1024).toFixed(1);
  console.log(`[3/3] PDF生成完了: ${outPath}`);
  console.log(`   サイズ: ${sizeKb} KB`);
  console.log(`   ※ ページ数は次のコマンドで確認: mdls -name kMDItemNumberOfPages "${outPath}"`);
}

main().catch((e) => {
  console.error('[generate-sample-pdf] FAILED:', e);
  process.exit(1);
});
