/**
 * DNA診断AI — 完了パイプライン統合
 *
 * finalizeDiagnosis(diagnosisId):
 *   1. PDF生成 (内部API /api/pdf 呼び出し)
 *   2. Supabase Storage アップロード
 *   3. reports テーブル更新
 *   4. 分身ボット作成 (clones テーブル insert / Phase 2-H 追加)
 *   5. メール送信 (Resend) — PDFリンク + ボットURL 両方
 *   6. スプシ追記 (Google Sheets API)
 *   7. email_logs に記録 (sender 内で実施)
 *
 * 各ステップは個別 try/catch で囲み、失敗してもスキップ可能 (部分成功OK)。
 * 結果は steps[] にステップごとの ok/error として返す。
 *
 * Node runtime 必須。
 */

import { uploadReportPdf } from '@/lib/supabase/storage';
import { sendCompletedReport } from '@/lib/email/sender';
import { appendDiagnosisToSheet } from '@/lib/sheets/appender';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { buildCloneSystemPrompt } from '@/lib/clone/system-prompt-builder';
import type { CelestialResult } from '@/lib/celestial/types';
import type { ScoreResult } from '@/lib/scoring/types';
import type { NarrativeBundle, UserProfile } from '@/lib/llm/types';

// ============================================================================
// 型
// ============================================================================

export interface FinalizeOptions {
  /** /api/pdf を呼ぶ際のベースURL (省略時は VERCEL_URL / NEXT_PUBLIC_SITE_URL) */
  baseUrl?: string;
  /** 完了メールに添える統合タグ */
  summaryKeywords?: string[];
  /** スプシ追記をスキップ */
  skipSheets?: boolean;
  /** メール送信をスキップ */
  skipEmail?: boolean;
}

export interface FinalizeStepResult {
  name: 'pdf' | 'storage' | 'reports' | 'clone' | 'email' | 'sheets';
  ok: boolean;
  durationMs: number;
  detail?: unknown;
  error?: string;
}

export interface FinalizeResult {
  diagnosisId: string;
  ok: boolean;            // 全ステップ成功なら true
  partial: boolean;       // 一部失敗だが継続したか
  steps: FinalizeStepResult[];
  reportUrl: string | null;
  cloneUrl: string | null;
}

// ============================================================================
// ヘルパ: 個別ステップ実行
// ============================================================================

async function runStep<T>(
  name: FinalizeStepResult['name'],
  fn: () => Promise<T>,
): Promise<FinalizeStepResult & { value?: T }> {
  const t0 = Date.now();
  try {
    const value = await fn();
    return {
      name,
      ok: true,
      durationMs: Date.now() - t0,
      value,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function getBaseUrl(opt?: string): string {
  if (opt) return opt.replace(/\/+$/, '');
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}`;
  }
  return 'http://localhost:3000';
}

// ============================================================================
// メイン
// ============================================================================

export async function finalizeDiagnosis(
  diagnosisId: string,
  opts: FinalizeOptions = {},
): Promise<FinalizeResult> {
  const supabase = getSupabaseServiceRoleClient();
  const steps: FinalizeStepResult[] = [];
  let reportUrl: string | null = null;
  // Phase 2-H で分身ボット作成完了時にURL取得予定、現状は未使用
  let _cloneUrl: string | null = null;
  void _cloneUrl;

  // ---- 1. PDF生成 ----
  const pdfStep = await runStep('pdf', async () => {
    const baseUrl = getBaseUrl(opts.baseUrl);
    const res = await fetch(`${baseUrl}/api/pdf`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ diagnosis_id: diagnosisId }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`/api/pdf returned ${res.status}: ${txt.slice(0, 200)}`);
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 1024) {
      throw new Error(`PDF size suspicious (${buf.byteLength}B)`);
    }
    return buf;
  });
  steps.push(stripValue(pdfStep));

  const pdfBuffer = pdfStep.ok
    ? (pdfStep as FinalizeStepResult & { value?: Uint8Array }).value
    : undefined;

  // ---- 2. Storage アップロード ----
  let storagePath: string | null = null;
  if (pdfBuffer) {
    const storageStep = await runStep('storage', async () => {
      const r = await uploadReportPdf(
        { diagnosisId, pdfBuffer },
        supabase,
      );
      reportUrl = r.publicUrl;
      storagePath = r.storagePath;
      return r;
    });
    steps.push(stripValue(storageStep));
  } else {
    steps.push({
      name: 'storage',
      ok: false,
      durationMs: 0,
      error: 'skipped: pdf step failed',
    });
  }

  // ---- 3. reports テーブル更新 ----
  if (storagePath && reportUrl) {
    const reportsStep = await runStep('reports', async () => {
      const { error } = await supabase
        .from('reports')
        .upsert(
          {
            diagnosis_id: diagnosisId,
            storage_path: storagePath!,
            public_url: reportUrl,
          },
          { onConflict: 'diagnosis_id' },
        );
      if (error) throw new Error(error.message);
      return { storagePath, publicUrl: reportUrl };
    });
    steps.push(stripValue(reportsStep));
  } else {
    steps.push({
      name: 'reports',
      ok: false,
      durationMs: 0,
      error: 'skipped: storage step failed',
    });
  }

  // ---- 4. メール送信 ----
  if (!opts.skipEmail) {
    const emailStep = await runStep('email', async () => {
      const r = await sendCompletedReport(diagnosisId, {
        summaryKeywords: opts.summaryKeywords,
        ...(pdfBuffer
          ? {
              pdfAttachment: {
                filename: `lifedna-report-${diagnosisId}.pdf`,
                content: pdfBuffer,
              },
            }
          : {}),
      });
      if (!r.ok) throw new Error(r.error ?? 'send failed');
      return r;
    });
    steps.push(stripValue(emailStep));
  }

  // ---- 5. スプシ追記 ----
  if (!opts.skipSheets) {
    const sheetsStep = await runStep('sheets', async () => {
      const r = await appendDiagnosisToSheet(diagnosisId);
      if (!r.ok) throw new Error(r.error ?? 'append failed');
      return r;
    });
    steps.push(stripValue(sheetsStep));
  }

  // diagnoses.completed_at を立てておく (まだなら)
  await supabase
    .from('diagnoses')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', diagnosisId)
    .is('completed_at', null);

  const allOk = steps.every((s) => s.ok);
  const anyOk = steps.some((s) => s.ok);
  return {
    diagnosisId,
    ok: allOk,
    partial: !allOk && anyOk,
    steps,
    reportUrl,
  };
}

function stripValue<T>(s: FinalizeStepResult & { value?: T }): FinalizeStepResult {
  // value はログ用なので結果には含めない (PDFバイナリ等の巨大データ対策)
  const { value: _v, ...rest } = s;
  void _v;
  return rest;
}
