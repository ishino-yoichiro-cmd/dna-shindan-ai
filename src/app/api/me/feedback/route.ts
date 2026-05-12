/**
 * POST /api/me/feedback — 分身AIの感想をYOにメール転送
 *
 * body: { diagnosisId: string; message: string }
 * diagnosisId の存在をDBで検証（スパム防止）。
 */

export const runtime = 'nodejs';

import { sendMail } from '@/lib/email/gmail';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return Response.json({ error: '感想が空です。' }, { status: 400 });
    }
    if (typeof body.diagnosisId !== 'string' || body.diagnosisId.trim().length === 0) {
      return Response.json({ error: '診断IDが不正です。' }, { status: 400 });
    }

    const diagnosisId = body.diagnosisId.trim();
    const message = body.message.trim().slice(0, 2000);

    // diagnosisId の存在検証（スパム防止）
    const supabase = getSupabaseServiceRoleClient();
    const { data: diagnosisRow } = await supabase
      .from('dna_diagnoses')
      .select('id')
      .eq('id', diagnosisId)
      .maybeSingle();

    if (!diagnosisRow) {
      return Response.json({ error: '診断データが見つかりません。' }, { status: 404 });
    }

    const result = await sendMail({
      to: 'yoisno@gmail.com',
      subject: '【DNA診断AI】分身AI 利用者からの感想',
      text: `診断ID: ${diagnosisId}\n\n${message}`,
      html: `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#fbfaf6;color:#1f2937;padding:24px;line-height:1.7;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e0d3;border-radius:12px;padding:32px;">
    <p style="color:#c9a44b;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">DNA SHINDAN AI</p>
    <h1 style="font-size:18px;color:#0a1f44;margin:0 0 16px;">分身AI 利用者からの感想</h1>
    <p style="font-size:13px;color:#6b7280;">診断ID: ${diagnosisId}</p>
    <div style="background:#fbfaf6;padding:16px;border-left:3px solid #c9a44b;border-radius:4px;white-space:pre-wrap;font-size:15px;">${message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>
</body></html>`,
    });

    if (!result.ok) {
      return Response.json({ error: '送信に失敗しました。しばらくして再度お試しください。' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[feedback]', e);
    return Response.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
