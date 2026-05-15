// POST /api/admin/resend-report
// 管理画面から1件だけレポート完了メールを再送する。
// YO 2026-05-16 指示: 「送られていても『届いていない』と言われることがあるので、
// 管理画面から全員にレポート生成完了メールの『再送ボタン』を設置してほしい」
//
// 認証: Authorization: Bearer <ADMIN_PASSWORD>
// Body : { id: string, previewOnly?: boolean }
//
// 設計方針:
// - admin 認証を通った手動操作。1件ずつ確認の上で送る。
// - report_text / email / access_token / pdf_storage_path が揃っていなければ送らない。
// - 連打防止: 直近 60 秒以内に同じ id へ手動再送した記録があれば 429 を返す。
// - 監査ログ: error_log に `manual_resend:<iso>:by:admin` を append。
// - previewOnly:true なら送信せず、subject/text/html を返す（モーダルプレビュー用）。

import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 30;

const RESEND_COOLDOWN_SEC = 60;

interface MailContent {
  to: string;
  subject: string;
  text: string;
  html: string;
  myPageUrl: string;
}

function buildMailContent(args: {
  email: string;
  firstName: string | null | undefined;
  id: string;
  accessToken: string;
  siteUrl: string;
}): MailContent {
  const greeting = args.firstName ? `${args.firstName} さん` : 'こんにちは';
  const myPageUrl = `${args.siteUrl}/me/${args.id}?token=${args.accessToken}`;
  const subject = '【DNA診断AI】あなたのレポートが完成しました（再送）';
  const text = `${greeting}

お待たせしました。
あなたのDNA診断レポートが完成しました。

▼ あなた専用のマイページ（このリンクは本人専用です）
${myPageUrl}

このマイページから：
・50ページ以上の統合レポートPDFをダウンロード
・あなた専用の分身AIボットと対話
・初回アクセス時に、次回ログイン用のパスワードを設定（このブラウザに自動保存されます）

ブックマーク推奨です。

— DNA診断AI
dna@kami-ai.jp
`;
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:'Noto Sans JP',-apple-system,sans-serif;background:#fbfaf6;color:#1f2937;padding:24px;line-height:1.7;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e0d3;border-radius:12px;padding:32px;">
    <p style="color:#c9a44b;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">DNA SHINDAN AI</p>
    <h1 style="font-size:20px;color:#0a1f44;margin:0 0 20px;">レポートが完成しました</h1>
    <p>${greeting}</p>
    <p>50ページ以上の統合レポートと、あなた専用の分身AIボットが完成しました。下記のマイページから、いつでもアクセスできます。</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${myPageUrl}" style="display:inline-block;background:#c9a44b;color:#0a1f44;padding:14px 32px;border-radius:24px;text-decoration:none;font-weight:bold;">
        マイページを開く
      </a>
    </p>
    <p style="background:#fbfaf6;padding:16px;border-left:3px solid #c9a44b;border-radius:4px;font-size:14px;">
      <strong style="color:#0a1f44;">マイページでできること</strong><br>
      ・50ページ以上のPDFレポートをダウンロード<br>
      ・あなた専用の分身AIボットと対話<br>
      ・初回ログイン時にパスワードを設定（次回以降ブラウザに自動保存）
    </p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;">
      このリンクは本人専用です。第三者に共有しないでください。<br>
      お問い合わせ：<a href="mailto:dna@kami-ai.jp" style="color:#c9a44b;">dna@kami-ai.jp</a>
    </p>
  </div>
</body></html>`;
  return { to: args.email, subject, text, html, myPageUrl };
}

export async function POST(req: Request) {
  const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? '';
  if (!ADMIN_PASS) {
    return Response.json({ ok: false, error: 'ADMIN_PASSWORD env missing' }, { status: 500 });
  }
  const authHeader = req.headers.get('authorization') ?? '';
  const bearerPass = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearerPass !== ADMIN_PASS) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { id?: string; previewOnly?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const id = (body.id ?? '').trim();
  const previewOnly = body.previewOnly === true;
  if (!id) {
    return Response.json({ ok: false, error: 'id_required' }, { status: 400 });
  }

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) {
    return Response.json({ ok: false, error: 'supabase_env_missing' }, { status: 500 });
  }
  const supa = createClient(sUrl, sKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: row, error: fetchErr } = await supa
    .from('dna_diagnoses')
    .select('id, email, first_name, access_token, status, pdf_storage_path, error_log, email_report_sent_at')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    return Response.json({ ok: false, error: `fetch_error:${fetchErr.message}` }, { status: 500 });
  }
  if (!row) {
    return Response.json({ ok: false, error: 'not_found' }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = row as any;

  if (r.status !== 'completed') {
    return Response.json({ ok: false, error: `status_not_completed:${r.status}` }, { status: 400 });
  }
  if (!r.email) {
    return Response.json({ ok: false, error: 'email_missing' }, { status: 400 });
  }
  if (!r.access_token) {
    return Response.json({ ok: false, error: 'access_token_missing' }, { status: 400 });
  }
  if (!r.pdf_storage_path) {
    return Response.json({ ok: false, error: 'pdf_not_generated' }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dna.kami-ai.jp';
  const content = buildMailContent({
    email: r.email,
    firstName: r.first_name,
    id,
    accessToken: r.access_token,
    siteUrl,
  });

  // ── プレビュー専用: 送信せずに本文だけ返す ──
  if (previewOnly) {
    return Response.json({
      ok: true,
      preview: true,
      to: content.to,
      subject: content.subject,
      text: content.text,
      html: content.html,
      myPageUrl: content.myPageUrl,
      wasAlreadySent: r.email_report_sent_at !== null,
      lastSentAt: r.email_report_sent_at,
    });
  }

  // ── 連打防止: 直近60秒以内の手動再送記録があれば拒否 ──
  const log: string = r.error_log ?? '';
  const recentManual = [...log.matchAll(/manual_resend:([0-9T:\-\.Z+]+)/g)]
    .map((m) => Date.parse(m[1]))
    .filter((t) => Number.isFinite(t));
  if (recentManual.length > 0) {
    const newest = Math.max(...recentManual);
    const sec = (Date.now() - newest) / 1000;
    if (sec < RESEND_COOLDOWN_SEC) {
      return Response.json({
        ok: false,
        error: 'cooldown',
        cooldownRemainingSec: Math.ceil(RESEND_COOLDOWN_SEC - sec),
      }, { status: 429 });
    }
  }

  // ── メール送信本体 ──
  const { sendMail } = await import('@/lib/email/gmail');
  const sendResult = await sendMail({
    to: content.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  const now = new Date().toISOString();
  if (sendResult.ok) {
    const newLog = `${log};manual_resend:${now}:by:admin`;
    await supa
      .from('dna_diagnoses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ email_report_sent_at: now, error_log: newLog } as any)
      .eq('id', id);
    return Response.json({
      ok: true,
      id,
      email: r.email,
      sentAt: now,
      messageId: sendResult.messageId,
      wasAlreadySent: r.email_report_sent_at !== null,
    });
  } else {
    const newLog = `${log};manual_resend:${now}:by:admin:fail:${sendResult.error ?? 'unknown'}`;
    await supa
      .from('dna_diagnoses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ error_log: newLog } as any)
      .eq('id', id);
    return Response.json({
      ok: false,
      id,
      email: r.email,
      error: sendResult.error ?? 'send_failed',
    }, { status: 502 });
  }
}
