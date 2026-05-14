// GET /api/admin/inbox?pass=...&limit=50
// POST /api/admin/inbox  { pass, action:'reply', to, subject, body, inReplyTo? }
//
// Gmail IMAP で受信メールを取得 / 管理画面受信ボックス用

import { ImapFlow } from 'imapflow';

export const runtime = 'nodejs';
export const maxDuration = 30;

function verifyPass(pass: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD ?? '';
  if (!adminPass) return false;
  return pass === adminPass;
}

export interface InboxMessage {
  uid: number;
  messageId: string;
  from: string;
  fromName: string;
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml?: string;
  read: boolean;
}

async function fetchInbox(limit = 50): Promise<InboxMessage[]> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD 未設定');

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();
  const messages: InboxMessage[] = [];

  try {
    const mailbox = await client.mailboxOpen('INBOX');
    const total = (mailbox && typeof mailbox === 'object' && 'exists' in mailbox ? (mailbox as { exists: number }).exists : 0);
    if (total === 0) return [];

    // 最新 limit 件を取得
    const start = Math.max(1, total - limit + 1);
    const range = `${start}:${total}`;

    for await (const msg of client.fetch(range, {
      envelope: true,
      bodyStructure: true,
      bodyParts: ['text', 'html', '1', '1.1', '2'],
      flags: true,
      uid: true,
    })) {
      try {
        const env = msg.envelope;
        if (!env) continue;
        const from = env.from?.[0];
        const fromEmail = (from && typeof from === 'object' && 'address' in from ? String(from.address ?? '') : '');
        const fromName = (from && typeof from === 'object' && 'name' in from ? String(from.name ?? fromEmail) : fromEmail);
        const subject = (env as { subject?: string }).subject ?? '(件名なし)';
        const dateVal = (env as { date?: Date }).date;
        const date = dateVal instanceof Date ? dateVal.toISOString() : new Date().toISOString();

        // テキスト本文を取得
        let bodyText = '';
        let bodyHtml: string | undefined;

        for (const [key, val] of msg.bodyParts ?? []) {
          const str = val?.toString() ?? '';
          if (key === 'text' || key === '1') {
            if (!bodyText) bodyText = str;
          } else if (key === 'html' || key === '2') {
            if (!bodyHtml) bodyHtml = str;
          }
        }

        if (!bodyText && bodyHtml) {
          bodyText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }

        messages.push({
          uid: msg.uid,
          messageId: (env as { messageId?: string }).messageId ?? String(msg.uid),
          from: fromEmail,
          fromName,
          subject,
          date,
          bodyText: bodyText.slice(0, 2000),
          bodyHtml: bodyHtml?.slice(0, 5000),
          read: msg.flags?.has('\\Seen') ?? false,
        });
      } catch {
        // 個別メッセージ解析エラーはスキップ
      }
    }

    // 新着順に並び替え
    messages.sort((a, b) => b.date.localeCompare(a.date));
  } finally {
    await client.logout();
  }

  return messages;
}

// GET: メール一覧取得
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pass = url.searchParams.get('pass') ?? '';
  if (!verifyPass(pass)) {
    return Response.json({ ok: false, error: '認証失敗' }, { status: 401 });
  }

  const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);

  try {
    const messages = await fetchInbox(limit);
    return Response.json({ ok: true, messages });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

// POST: 返信送信
export async function POST(req: Request) {
  let body: { pass?: string; to?: string; subject?: string; replyBody?: string; inReplyTo?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: '不正なリクエスト' }, { status: 400 });
  }

  if (!body.pass || !verifyPass(body.pass)) {
    return Response.json({ ok: false, error: '認証失敗' }, { status: 401 });
  }

  const { to, subject, replyBody, inReplyTo } = body;
  if (!to || !subject || !replyBody) {
    return Response.json({ ok: false, error: '宛先・件名・本文は必須です' }, { status: 400 });
  }

  const { sendMail } = await import('@/lib/email/gmail');

  const htmlBody = `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:'Noto Sans JP',-apple-system,sans-serif;background:#fbfaf6;color:#1f2937;padding:24px;line-height:1.7;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e0d3;border-radius:12px;padding:32px;">
    <p style="color:#c9a44b;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">DNA SHINDAN AI</p>
    <div style="white-space:pre-wrap;font-size:15px;line-height:1.8;">${replyBody.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
    <p style="color:#6b7280;font-size:12px;margin-top:32px;border-top:1px solid #e5e0d3;padding-top:16px;">
      お問い合わせ：<a href="mailto:dna@kami-ai.jp" style="color:#c9a44b;">dna@kami-ai.jp</a>
    </p>
  </div>
</body></html>`;

  const result = await sendMail({
    to,
    subject,
    text: replyBody,
    html: htmlBody,
  });

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: 500 });
  }

  void inReplyTo; // 将来: In-Reply-To ヘッダー対応
  return Response.json({ ok: true });
}
