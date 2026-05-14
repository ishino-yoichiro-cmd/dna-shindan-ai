// POST /api/admin/send-mail
// 管理画面からの一括・個別メール送信API
//
// body: {
//   pass: string,
//   to: 'all' | 'completed' | string[],  // all=全員 / completed=完了者 / string[]=ID配列
//   subject: string,
//   body: string,   // {{name}} {{firstName}} {{myPageUrl}} プレースホルダー対応
// }

import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/email/gmail';

export const runtime = 'nodejs';
export const maxDuration = 120;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dna.kami-ai.jp';

function verifyPass(pass: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD ?? '';
  if (!adminPass) return false;
  return pass === adminPass;
}

export async function POST(req: Request) {
  let body: { pass?: string; to?: unknown; subject?: string; body?: string; confirm?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: '不正なリクエスト' }, { status: 400 });
  }

  if (!body.pass || !verifyPass(body.pass)) {
    return Response.json({ ok: false, error: '認証失敗' }, { status: 401 });
  }

  const { to, subject, body: bodyText } = body;
  if (!subject?.trim() || !bodyText?.trim()) {
    return Response.json({ ok: false, error: '件名・本文は必須です' }, { status: 400 });
  }

  // 一括送信（all/completed）は confirm:true が必須 — 誤API叩きによる誤送信防止
  if ((to === 'all' || to === 'completed') && !body.confirm) {
    return Response.json(
      { ok: false, error: '一括送信には confirm:true が必要です', requireConfirm: true },
      { status: 400 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // 宛先を決定
  let query = supabase
    .from('dna_diagnoses')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select('id, first_name, last_name, email, access_token, status') as any;

  if (to === 'all') {
    // 隠し以外の全員（メールアドレスがある人）
    query = query.not('email', 'is', null).is('hidden_at', null);
  } else if (to === 'completed') {
    query = query.eq('status', 'completed').not('email', 'is', null).is('hidden_at', null);
  } else if (Array.isArray(to)) {
    query = query.in('id', to).not('email', 'is', null);
  } else {
    return Response.json({ ok: false, error: '宛先(to)が不正です' }, { status: 400 });
  }

  const { data: rows, error } = await query;
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) {
    return Response.json({ ok: true, sent: 0, failed: 0, total: 0, details: [] });
  }

  // 順次送信（SMTP負荷対策で1通ずつ）
  let sent = 0;
  let failed = 0;
  const details: { email: string; ok: boolean; error?: string }[] = [];

  for (const row of rows) {
    const firstName = row.first_name ?? '';
    const name = [row.last_name, row.first_name].filter(Boolean).join(' ') || firstName || 'お客様';
    const myPageUrl = row.access_token
      ? `${SITE_URL}/me/${row.id}?token=${row.access_token}`
      : `${SITE_URL}/me/${row.id}`;

    // プレースホルダー置換
    const resolvedSubject = subject
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{myPageUrl\}\}/g, myPageUrl);

    const resolvedBody = bodyText
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{myPageUrl\}\}/g, myPageUrl);

    // HTML版（改行をbrに変換）
    const htmlBody = `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:'Noto Sans JP',-apple-system,sans-serif;background:#fbfaf6;color:#1f2937;padding:24px;line-height:1.7;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e0d3;border-radius:12px;padding:32px;">
    <p style="color:#c9a44b;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">DNA SHINDAN AI</p>
    <div style="white-space:pre-wrap;font-size:15px;line-height:1.8;">${resolvedBody.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
    <p style="color:#6b7280;font-size:12px;margin-top:32px;border-top:1px solid #e5e0d3;padding-top:16px;">
      お問い合わせ：<a href="mailto:dna@kami-ai.jp" style="color:#c9a44b;">dna@kami-ai.jp</a>
    </p>
  </div>
</body></html>`;

    const result = await sendMail({
      to: row.email,
      subject: resolvedSubject,
      text: resolvedBody,
      html: htmlBody,
    });

    if (result.ok) {
      sent++;
      details.push({ email: row.email, ok: true });
    } else {
      failed++;
      details.push({ email: row.email, ok: false, error: result.error });
    }

    // SMTP負荷対策: 100ms間隔
    await new Promise(r => setTimeout(r, 100));
  }

  return Response.json({ ok: true, sent, failed, total: rows.length, details });
}
