// POST /api/admin/send-mail
// 管理画面からの一括・個別メール送信API
//
// body: {
//   pass: string,
//   to: 'all' | 'completed' | string[],  // all=全員 / completed=完了者 / string[]=ID配列
//   subject: string,
//   body: string,   // {{name}} {{firstName}} {{myPageUrl}} プレースホルダー対応
//   confirm: true,         // 一括送信（all/completed）時は必須
//   targetCount: number,   // 一括送信時は必須 — DBの実件数と一致しない場合は物理拒否
// }
//
// 【誤送信防止 2重ゲート】
// Gate 1: confirm:true がなければ即拒否
// Gate 2: targetCount が DB の実件数と一致しなければ即拒否
//   → 盲目的な curl 直叩き・件数不明での一括送信を構造的に不可能にする

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
  let body: {
    pass?: string;
    to?: unknown;
    subject?: string;
    body?: string;
    confirm?: boolean;
    targetCount?: number;
  };
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

  // ── Gate 1: 一括送信は confirm:true 必須 ──────────────────────────────────
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase.from('dna_diagnoses').select('id, first_name, last_name, email, access_token, status') as any;

  if (to === 'all') {
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

  // ── Gate 2: targetCount 照合（一括送信のみ） ──────────────────────────────
  // 呼び出し元が明示した件数と DB の実件数が一致しない場合は物理拒否。
  // これにより「何人に送るか把握せずに叩く」ことが構造的に不可能になる。
  if (to === 'all' || to === 'completed') {
    if (body.targetCount === undefined || body.targetCount === null) {
      return Response.json(
        {
          ok: false,
          error: `一括送信には targetCount（送信対象件数）の明示が必要です。現在の対象: ${rows.length}件`,
          actualCount: rows.length,
        },
        { status: 400 },
      );
    }
    if (body.targetCount !== rows.length) {
      return Response.json(
        {
          ok: false,
          error: `件数不一致: 指定 ${body.targetCount}件 ≠ 実際 ${rows.length}件。管理画面を再読み込みして件数を確認してください。`,
          actualCount: rows.length,
        },
        { status: 400 },
      );
    }
  }

  // 並列送信（concurrency=5）でタイムアウト回避
  // 順次100ms間隔だと112件で112秒超 → Vercelタイムアウト。
  // 並列5で約20〜25秒に短縮。Gmail SMTPは接続キャッシュ済みのため並列可。
  const CONCURRENCY = 5;
  const details: { email: string; ok: boolean; error?: string }[] = [];
  let sent = 0;
  let failed = 0;

  const buildPayload = (row: { first_name?: string; last_name?: string; access_token?: string; id: string }) => {
    const firstName = row.first_name ?? '';
    const name = [row.last_name, row.first_name].filter(Boolean).join(' ') || firstName || 'お客様';
    const myPageUrl = row.access_token
      ? `${SITE_URL}/me/${row.id}?token=${row.access_token}`
      : `${SITE_URL}/me/${row.id}`;
    const resolvedSubject = subject
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{myPageUrl\}\}/g, myPageUrl);
    const resolvedBody = bodyText
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{firstName\}\}/g, firstName)
      .replace(/\{\{myPageUrl\}\}/g, myPageUrl);
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
    return { email: row.email as string, resolvedSubject, resolvedBody, htmlBody };
  };

  // concurrency制御付き並列実行
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(row => {
        const { email, resolvedSubject, resolvedBody, htmlBody } = buildPayload(row);
        return sendMail({ to: email, subject: resolvedSubject, text: resolvedBody, html: htmlBody })
          .then(r => ({ email, result: r }));
      }),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value.result.ok) {
          sent++;
          details.push({ email: r.value.email, ok: true });
        } else {
          failed++;
          details.push({ email: r.value.email, ok: false, error: r.value.result.error });
        }
      } else {
        failed++;
        details.push({ email: '(unknown)', ok: false, error: String(r.reason) });
      }
    }
  }

  return Response.json({ ok: true, sent, failed, total: rows.length, details });
}
