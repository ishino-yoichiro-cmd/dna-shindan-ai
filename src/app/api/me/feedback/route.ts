/**
 * POST /api/me/feedback — 分身AIの感想をDBに保存 + YOにメール転送
 *
 * body: { diagnosisId: string; message: string }
 * diagnosisId の存在をDBで検証（スパム防止）。
 * 感想は dna_feedbacks テーブルにも保存（管理画面での一覧表示用）。
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
      .select('id, first_name, last_name, clone_display_name, email')
      .eq('id', diagnosisId)
      .maybeSingle();

    if (!diagnosisRow) {
      return Response.json({ error: '診断データが見つかりません。' }, { status: 404 });
    }

    // 感想をDBに保存（管理画面用）
    const { error: insertErr } = await supabase
      .from('dna_feedbacks')
      .insert({ diagnosis_id: diagnosisId, message });

    if (insertErr) {
      console.error('[feedback] DB insert error:', insertErr.message);
      // DB保存失敗でもメール送信は続行
    }

    const displayName = [diagnosisRow.last_name, diagnosisRow.first_name]
      .filter(Boolean).join(' ') || diagnosisRow.clone_display_name || '(no-name)';

    const safeDisplayName = displayName.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const safeMessage     = message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // YO への通知メール
    const notifyResult = await sendMail({
      to: 'yoisno@gmail.com',
      subject: '【DNA診断AI】分身AI 利用者からの感想',
      text: `送信者: ${displayName}\n診断ID: ${diagnosisId}\n\n${message}`,
      html: `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#fbfaf6;color:#1f2937;padding:24px;line-height:1.7;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e0d3;border-radius:12px;padding:32px;">
    <p style="color:#c9a44b;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">DNA SHINDAN AI</p>
    <h1 style="font-size:18px;color:#0a1f44;margin:0 0 16px;">分身AI 利用者からの感想</h1>
    <p style="font-size:13px;color:#6b7280;">送信者: ${safeDisplayName}</p>
    <p style="font-size:13px;color:#6b7280;">診断ID: ${diagnosisId}</p>
    <div style="background:#fbfaf6;padding:16px;border-left:3px solid #c9a44b;border-radius:4px;white-space:pre-wrap;font-size:15px;">${safeMessage}</div>
  </div>
</body></html>`,
    });

    // 感想送信者へのお礼メール（メールアドレスがある場合のみ）
    const userEmail = (diagnosisRow as { email?: string | null }).email ?? null;
    if (userEmail) {
      await sendMail({
        to: userEmail,
        subject: '【DNA診断AI】感想をありがとうございます＋プレゼントのご案内',
        text: [
          `${displayName} さん`,
          '',
          '貴重なご意見ありがとうございます。今後の開発に活かさせていただきます。',
          '',
          '感想をご提出いただいた方には、',
          '「ClaudeCode初心者が初日に設定すべき7つの神設定」',
          'もプレゼントさせていただきます。',
          '',
          'https://bit.ly/tips7',
          '',
          'ご活用いただきClaudeCodeを',
          'より使いこなしていただけたら嬉しいです。',
          '次回の神プロダクトのご案内もお楽しみに。',
        ].join('\n'),
        html: `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#fbfaf6;color:#1f2937;padding:24px;line-height:1.8;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e0d3;border-radius:12px;padding:32px;">
    <p style="color:#c9a44b;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">DNA SHINDAN AI</p>
    <p style="font-size:15px;color:#1f2937;margin:0 0 20px;">${safeDisplayName} さん</p>
    <p style="font-size:15px;color:#1f2937;margin:0 0 24px;">貴重なご意見ありがとうございます。今後の開発に活かさせていただきます。</p>
    <div style="background:#fffbf0;border:1px solid #c9a44b;border-radius:10px;padding:24px;margin:0 0 24px;">
      <p style="color:#c9a44b;font-size:12px;letter-spacing:2px;margin:0 0 10px;">PRESENT</p>
      <p style="font-size:15px;color:#1f2937;margin:0 0 12px;">感想をご提出いただいた方には、<br><strong>「ClaudeCode初心者が初日に設定すべき7つの神設定」</strong><br>もプレゼントさせていただきます。</p>
      <a href="https://bit.ly/tips7" style="display:inline-block;background:#c9a44b;color:#fff;font-weight:bold;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">プレゼントを受け取る</a>
    </div>
    <p style="font-size:14px;color:#6b7280;line-height:1.8;margin:0;">ご活用いただきClaudeCodeを<br>より使いこなしていただけたら嬉しいです。<br>次回の神プロダクトのご案内もお楽しみに。</p>
  </div>
</body></html>`,
      }).catch((e) => {
        // お礼メール失敗はサイレント（YO通知・DB保存を優先）
        console.error('[feedback] thank-you mail error:', e);
      });
    }

    if (!notifyResult.ok) {
      // YO通知失敗でもDB保存済みなら ok を返す
      if (!insertErr) return Response.json({ ok: true });
      return Response.json({ error: '送信に失敗しました。しばらくして再度お試しください。' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('[feedback]', e);
    return Response.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
