/**
 * DNA診断AI — 完了通知メール送信
 *
 * sendCompletedReport(diagnosisId):
 *   1. Supabase から diagnoses + reports + clones を取得
 *   2. Resend で完了通知メール送信 (HTML + text)
 *   3. email_logs に記録
 *
 * Node runtime 必須 (Resend SDK が fetch ベースなので Edge でも動くが、
 * 統合フローで PDF 等と合わせるため Node 固定とする)
 */

import { getResendClient, getResendEnv } from './client';
import {
  renderCompletedReportEmail,
  renderProgressReminderEmail,
  type RenderedEmail,
  type CompletedReportTemplateInput,
  type ProgressReminderTemplateInput,
} from './templates';
import { getSupabaseServiceRoleClient } from '../supabase/server';

// ============================================================================
// 型
// ============================================================================

export interface SendCompletedReportOptions {
  /** 添付するPDFのバイナリ (省略時はURLのみで送信) */
  pdfAttachment?: {
    filename: string;
    content: Uint8Array | Buffer | string; // string は base64 を許容
  };
  /** 統合タグ (キーワード) */
  summaryKeywords?: string[];
}

export interface SendCompletedReportResult {
  ok: boolean;
  resendId: string | null;
  recipient: string | null;
  subject: string;
  /** email_logs に挿入したログレコード id */
  emailLogId: string | null;
  /** 失敗時のエラー */
  error?: string;
}

// ============================================================================
// 完了通知メール送信
// ============================================================================

export async function sendCompletedReport(
  diagnosisId: string,
  opts: SendCompletedReportOptions = {},
): Promise<SendCompletedReportResult> {
  const supabase = getSupabaseServiceRoleClient();

  // ---- 1. Supabase からデータ取得 ----
  const [diagRes, reportRes, cloneRes] = await Promise.all([
    supabase
      .from('diagnoses')
      .select('id,email,full_name,relationship_tag,metadata')
      .eq('id', diagnosisId)
      .maybeSingle(),
    supabase
      .from('reports')
      .select('public_url,storage_path')
      .eq('diagnosis_id', diagnosisId)
      .maybeSingle(),
    supabase
      .from('clones')
      .select('public_url')
      .eq('diagnosis_id', diagnosisId)
      .maybeSingle(),
  ]);

  if (diagRes.error || !diagRes.data) {
    return failResult(
      `[email/sender] diagnoses が取得できません diagnosisId=${diagnosisId}: ${diagRes.error?.message ?? 'not found'}`,
    );
  }

  const diag = diagRes.data;

  if (!diag.email) {
    return failResult(
      `[email/sender] diagnoses.email が空のため送信できません diagnosisId=${diagnosisId}`,
    );
  }

  // ---- 2. テンプレ生成 ----
  const tplInput: CompletedReportTemplateInput = {
    fullName: diag.full_name,
    relationshipTag: diag.relationship_tag,
    reportUrl: reportRes.data?.public_url ?? null,
    cloneUrl: cloneRes.data?.public_url ?? null,
    summaryKeywords: opts.summaryKeywords,
  };
  const rendered = renderCompletedReportEmail(tplInput);

  // ---- 3. Resend 送信 ----
  const resend = getResendClient();
  const env = getResendEnv();

  const sendPayload: Parameters<typeof resend.emails.send>[0] = {
    from: env.from,
    to: diag.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    ...(env.replyTo ? { replyTo: env.replyTo } : {}),
    ...(opts.pdfAttachment
      ? {
          attachments: [
            {
              filename: opts.pdfAttachment.filename,
              content: opts.pdfAttachment.content as never,
            },
          ],
        }
      : {}),
  };

  const sendResult = await resend.emails.send(sendPayload);

  if (sendResult.error) {
    // Resend 側でエラーでも email_logs には失敗ログを残す
    const logId = await insertEmailLog(supabase, {
      diagnosisId,
      recipient: diag.email,
      subject: rendered.subject,
      bodyPreview: rendered.text.slice(0, 240),
      resendId: null,
    });
    return failResult(
      `[email/sender] Resend 送信失敗: ${sendResult.error.message}`,
      {
        recipient: diag.email,
        subject: rendered.subject,
        emailLogId: logId,
      },
    );
  }

  const resendId = sendResult.data?.id ?? null;

  // ---- 4. email_logs に記録 ----
  const logId = await insertEmailLog(supabase, {
    diagnosisId,
    recipient: diag.email,
    subject: rendered.subject,
    bodyPreview: rendered.text.slice(0, 240),
    resendId,
  });

  return {
    ok: true,
    resendId,
    recipient: diag.email,
    subject: rendered.subject,
    emailLogId: logId,
  };
}

// ============================================================================
// 進捗中断リマインダー (骨格のみ・24h 後 cron 等で呼ぶ想定)
// ============================================================================

export interface SendProgressReminderResult {
  ok: boolean;
  resendId: string | null;
  recipient: string | null;
  subject: string;
  emailLogId: string | null;
  error?: string;
}

export async function sendProgressReminder(
  diagnosisId: string,
  resumeUrl: string,
): Promise<SendProgressReminderResult> {
  const supabase = getSupabaseServiceRoleClient();

  const { data: diag, error } = await supabase
    .from('diagnoses')
    .select('id,email,full_name,status')
    .eq('id', diagnosisId)
    .maybeSingle();

  if (error || !diag) {
    return failResult(
      `[email/sender] diagnoses が取得できません diagnosisId=${diagnosisId}: ${error?.message ?? 'not found'}`,
    );
  }

  if (diag.status === 'completed') {
    // 既に完了している人にリマインダーは送らない
    return {
      ok: true,
      resendId: null,
      recipient: diag.email,
      subject: '(skipped: already completed)',
      emailLogId: null,
    };
  }

  if (!diag.email) {
    return failResult(
      `[email/sender] diagnoses.email が空のため送信できません diagnosisId=${diagnosisId}`,
    );
  }

  const tplInput: ProgressReminderTemplateInput = {
    fullName: diag.full_name,
    resumeUrl,
  };
  const rendered = renderProgressReminderEmail(tplInput);

  const resend = getResendClient();
  const env = getResendEnv();

  const sendResult = await resend.emails.send({
    from: env.from,
    to: diag.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    ...(env.replyTo ? { replyTo: env.replyTo } : {}),
  });

  if (sendResult.error) {
    return failResult(
      `[email/sender] Resend リマインダー送信失敗: ${sendResult.error.message}`,
    );
  }

  const resendId = sendResult.data?.id ?? null;
  const logId = await insertEmailLog(supabase, {
    diagnosisId,
    recipient: diag.email,
    subject: rendered.subject,
    bodyPreview: rendered.text.slice(0, 240),
    resendId,
  });

  return {
    ok: true,
    resendId,
    recipient: diag.email,
    subject: rendered.subject,
    emailLogId: logId,
  };
}

// ============================================================================
// 内部ヘルパ
// ============================================================================

async function insertEmailLog(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  params: {
    diagnosisId: string;
    recipient: string;
    subject: string;
    bodyPreview: string;
    resendId: string | null;
  },
): Promise<string | null> {
  const { data, error } = await supabase
    .from('email_logs')
    .insert({
      diagnosis_id: params.diagnosisId,
      recipient: params.recipient,
      subject: params.subject,
      body_preview: params.bodyPreview,
      resend_id: params.resendId,
    })
    .select('id')
    .single();

  if (error) {
    // ログ挿入失敗は非致命。コンソールに出すだけ。
    console.error(`[email/sender] email_logs insert 失敗: ${error.message}`);
    return null;
  }
  return data?.id ?? null;
}

function failResult(
  message: string,
  partial?: {
    recipient?: string;
    subject?: string;
    emailLogId?: string | null;
  },
): SendCompletedReportResult {
  return {
    ok: false,
    resendId: null,
    recipient: partial?.recipient ?? null,
    subject: partial?.subject ?? '',
    emailLogId: partial?.emailLogId ?? null,
    error: message,
  };
}

// ============================================================================
// テスト用エクスポート (実送信なしでテンプレだけ取得)
// ============================================================================

export { renderCompletedReportEmail, renderProgressReminderEmail };
export type { RenderedEmail };
