// Gmail SMTP メール送信モジュール（Resend無料枠の宛先制限を回避）
// 必要env: GMAIL_USER, GMAIL_APP_PASSWORD（Google App Password）

import nodemailer, { type Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null = null;

export function getMailer(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('[gmail] GMAIL_USER / GMAIL_APP_PASSWORD 未設定です');
  }
  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return cachedTransporter;
}

interface SendArgs {
  to: string;
  subject: string;
  text: string;
  html?: string;
  bcc?: string;
  attachments?: { filename: string; content: Buffer | string }[];
}

export async function sendMail(args: SendArgs): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    const t = getMailer();
    // Gmail SMTP は認証アカウント（GMAIL_USER）以外のfromアドレスを拒否する
    // → from は GMAIL_USER 固定、reply-to に dna@kami-ai.jp を設定
    const from = `"DNA診断AI" <${process.env.GMAIL_USER}>`;
    const replyTo = process.env.EMAIL_REPLY_TO ?? 'dna@kami-ai.jp';
    const info = await t.sendMail({
      from,
      replyTo,
      to: args.to,
      bcc: args.bcc,
      subject: args.subject,
      text: args.text,
      html: args.html,
      attachments: args.attachments,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendReceiptMail({
  to,
  firstName,
}: {
  to: string;
  firstName?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const greeting = firstName ? `${firstName} さん` : 'こんにちは';
  const subject = '【DNA診断AI】診断データを受け取りました';
  const text = `${greeting}

診断データを受け取りました。

ただいま、命術16診断（四柱推命・紫微斗数・西洋占星・数秘・姓名判断ほか）と
心理スコア・あなたの記述を統合した約50ページ以上のレポートと、
あなた専用の分身AIボットURLを生成しています。

完成したレポートとボットURLは、このメールアドレス宛に
おおよそ30分〜1時間以内にお届けします。

何か問題やご質問があれば、このメールに返信するか
dna@kami-ai.jp までご連絡ください。

— DNA診断AI
`;

  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:'Noto Sans JP',-apple-system,sans-serif;background:#fbfaf6;color:#1f2937;padding:24px;line-height:1.7;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e0d3;border-radius:12px;padding:32px;">
    <p style="color:#c9a44b;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">DNA SHINDAN AI</p>
    <h1 style="font-size:20px;color:#0a1f44;margin:0 0 20px;">診断データを受け取りました</h1>
    <p>${greeting}</p>
    <p>診断データを受け取りました。</p>
    <p>ただいま、命術16診断と心理スコア・あなたの記述を統合した約50ページ以上のレポートと、あなた専用の分身AIボットURLを生成しています。</p>
    <p style="background:#fbfaf6;padding:16px;border-left:3px solid #c9a44b;border-radius:4px;">
      <strong style="color:#0a1f44;">完成までの目安：30分〜1時間</strong><br>
      完成次第このメールアドレス宛にお送りします。
    </p>
    <p>何か問題やご質問があれば、このメールに返信するか<br>
       <a href="mailto:dna@kami-ai.jp" style="color:#c9a44b;">dna@kami-ai.jp</a> までご連絡ください。</p>
    <p style="color:#6b7280;font-size:12px;margin-top:32px;">— DNA診断AI</p>
  </div>
</body></html>`;

  return sendMail({ to, subject, text, html });
}

export async function sendReportMail({
  to,
  firstName,
  myPageUrl,
}: {
  to: string;
  firstName?: string;
  myPageUrl: string;
  // 互換のため残す（今は使わない）
  reportText?: string;
  cloneUrl?: string;
  pdfBuffer?: Buffer;
}): Promise<{ ok: boolean; error?: string }> {
  const greeting = firstName ? `${firstName} さん` : 'こんにちは';
  const subject = '【DNA診断AI】あなたのレポートが完成しました';
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
  return sendMail({ to, subject, text, html });
}
