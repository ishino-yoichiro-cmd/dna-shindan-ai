/**
 * DNA診断AI — メールテンプレート
 *
 * cristyトーン（占い口調・スピ用語・感嘆符過多禁止）。
 * 「ちゃんと見てもらえた」温度感を維持する。
 *
 * 関係性タグ別の冒頭文は report_structure_v1.md の200字テンプレを採用。
 */

import type { RelationshipTag } from '../supabase/database.types';

// ============================================================================
// 共通ユーティリティ
// ============================================================================

/** 安全な HTML エスケープ (テンプレート埋め込み用) */
function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 「◯◯さん」形式のフォーマット */
function honorific(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  if (!n) return 'あなた';
  return `${n}さん`;
}

// ============================================================================
// 関係性タグ別の冒頭文 (200字テンプレ・報告書 終章ベース)
// ============================================================================

/**
 * report_structure_v1.md 「関係性タグ別メッセージ・テンプレート骨格（200字 × 8）」
 * を完了通知メールの冒頭部にも採用。
 *
 * NOTE: 終章本文は PDF 内に既に格納される。
 * ここはあくまで「メールの導入で関係性に応じた一言を添える」用途。
 */
export const RELATIONSHIP_OPENERS: Record<RelationshipTag, string> = {
  マブダチ:
    'マブダチに送るレポートはちょっと特別だ。診断の前から知ってる相手だからこそ、知らなかった面が見えてくる。それがこの50ページ以上の設計図のおもしろいとこ。',
  友達:
    '友達のあなたに向けてこれを送るのは、ちょっと照れる。でも今日は真面目に。あなたの中にある「言語化されてない芯」を、ちゃんと言葉にしておきたかった。',
  旧友:
    '久しぶりに連絡したのに、診断を受けてくれてありがとう。あの頃のあなたと今のあなたで、たぶん変わってない芯がある。レポートはその芯のほうを言語化してる。',
  ビジネスパートナー:
    '一緒に仕事する相手のことを、ここまで言語化された形で読めるのは、人生で何度もない。これからの仕事で何度も使えるから、お互いの設計図を持って組みたい。',
  クライアント:
    'これはコンサル契約とは別に、僕からの個人的な贈り物として届けたい。クライアントとして接してきたあなたの観察と、データが一致した部分が多くて、正直驚いた。',
  企画参加者:
    '僕の企画に参加してくれた一人ひとりを、僕は番号として扱いたくない。だからこの診断を全員に届けてる。あなたが企画で発した一言、僕はちゃんと覚えてる。',
  知り合い:
    'どこかで一度会っただけのあなたが、診断を受けてくれたのは正直うれしい。ほとんど知らないままだったけど、このレポートを通せば50ページ以上分は知ったことになる。',
  'この診断で知った':
    'はじめまして。あなたとは、この診断が最初の接点。会ったことがないのに、あなたの怒りや夢中体験を知っている——不思議な距離感のまま、この50ページ以上を届ける。',
};

function relationshipOpener(tag: RelationshipTag | null): string {
  if (!tag) return RELATIONSHIP_OPENERS['この診断で知った'];
  return RELATIONSHIP_OPENERS[tag] ?? RELATIONSHIP_OPENERS['この診断で知った'];
}

// ============================================================================
// 完了通知メール
// ============================================================================

export interface CompletedReportTemplateInput {
  fullName: string | null;
  relationshipTag: RelationshipTag | null;
  /** PDF レポートの公開 URL (もしくは signed URL) */
  reportUrl: string | null;
  /** 分身 AI ボットの URL */
  cloneUrl: string | null;
  /** 統計レアさ・キーワード等、メールに添える簡易要約 (任意) */
  summaryKeywords?: string[];
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * 「あなたのライフDNAレポートが完成しました」
 * 件名サンプル：「【ライフDNA】◯◯さん、あなたの設計図をお届けします」
 */
export function renderCompletedReportEmail(
  input: CompletedReportTemplateInput,
): RenderedEmail {
  const name = honorific(input.fullName);
  const opener = relationshipOpener(input.relationshipTag);
  const subject = `【ライフDNA】${name.replace(/さん$/, '')}さん、あなたの設計図をお届けします`;

  const reportUrl = input.reportUrl;
  const cloneUrl = input.cloneUrl;
  const keywords = (input.summaryKeywords ?? []).filter(Boolean).slice(0, 6);

  // -------- プレーンテキスト --------
  const textLines: string[] = [
    `${name}`,
    '',
    'お待たせしました。',
    'あなたのライフDNAレポートが完成しました。',
    '',
    opener,
    '',
    '━━━━━━━━━━━━━━━━━━',
    'このメールに含まれるもの',
    '━━━━━━━━━━━━━━━━━━',
    '・PDFレポート（約50ページ以上・命術16＋心理＋あなたの言葉を統合）',
    '・あなた専用の分身AIボットURL',
    '',
  ];

  if (keywords.length > 0) {
    textLines.push('━━━━━━━━━━━━━━━━━━');
    textLines.push('あなたを表す言葉');
    textLines.push('━━━━━━━━━━━━━━━━━━');
    textLines.push(keywords.join(' / '));
    textLines.push('');
  }

  if (reportUrl) {
    textLines.push('▼ レポートを開く');
    textLines.push(reportUrl);
    textLines.push('');
  } else {
    textLines.push('▼ レポート');
    textLines.push('（PDFは添付しています）');
    textLines.push('');
  }

  if (cloneUrl) {
    textLines.push('▼ あなたの分身AIと話す');
    textLines.push(cloneUrl);
    textLines.push('');
  }

  textLines.push(
    'このレポートは、あなたという奇跡の50ページ以上分。',
    '何度も読み返してほしい。',
    '1年後にもう一度開くと、違うところが響く。',
    '',
    '— DNA SHINDAN AI',
    '',
    '※このメールはDNA診断AIから自動配信されています。',
  );

  const text = textLines.join('\n');

  // -------- HTML --------
  const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#0b0b0e;color:#1f1f23;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0e;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:36px 32px 16px 32px;">
          <div style="font-size:12px;letter-spacing:0.18em;color:#8a8a93;">DNA SHINDAN AI</div>
          <h1 style="margin:8px 0 0 0;font-size:22px;line-height:1.5;color:#1f1f23;font-weight:600;">
            ${esc(name)}、あなたの設計図をお届けします
          </h1>
        </td></tr>

        <tr><td style="padding:0 32px 8px 32px;">
          <p style="margin:16px 0 0 0;font-size:15px;line-height:1.85;color:#3a3a42;">
            お待たせしました。<br>
            あなたのライフDNAレポートが完成しました。
          </p>
          <p style="margin:20px 0 0 0;font-size:15px;line-height:1.9;color:#3a3a42;border-left:3px solid #d8d3c4;padding:8px 0 8px 16px;background:#faf8f3;">
            ${esc(opener)}
          </p>
        </td></tr>

        <tr><td style="padding:24px 32px 0 32px;">
          <div style="font-size:11px;letter-spacing:0.16em;color:#8a8a93;">CONTENTS</div>
          <ul style="margin:8px 0 0 0;padding:0 0 0 18px;font-size:14px;line-height:1.9;color:#3a3a42;">
            <li>PDFレポート（約50ページ以上・命術16＋心理＋あなたの言葉を統合）</li>
            <li>あなた専用の分身AIボットURL</li>
          </ul>
        </td></tr>

        ${
          keywords.length > 0
            ? `<tr><td style="padding:24px 32px 0 32px;">
          <div style="font-size:11px;letter-spacing:0.16em;color:#8a8a93;">あなたを表す言葉</div>
          <div style="margin-top:8px;">
            ${keywords
              .map(
                (k) =>
                  `<span style="display:inline-block;margin:4px 6px 0 0;padding:6px 12px;border-radius:999px;background:#f1ede2;color:#5b5640;font-size:12px;letter-spacing:0.04em;">${esc(k)}</span>`,
              )
              .join('')}
          </div>
        </td></tr>`
            : ''
        }

        <tr><td style="padding:32px 32px 8px 32px;">
          ${
            reportUrl
              ? `<a href="${esc(reportUrl)}" style="display:block;text-align:center;background:#1f1f23;color:#ffffff;padding:14px 24px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.04em;">レポートを開く</a>`
              : `<div style="text-align:center;color:#8a8a93;font-size:13px;">PDFはこのメールに添付されています</div>`
          }
        </td></tr>

        ${
          cloneUrl
            ? `<tr><td style="padding:8px 32px 8px 32px;">
          <a href="${esc(cloneUrl)}" style="display:block;text-align:center;background:#ffffff;color:#1f1f23;border:1px solid #1f1f23;padding:13px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;letter-spacing:0.04em;">あなたの分身AIと話す</a>
        </td></tr>`
            : ''
        }

        <tr><td style="padding:28px 32px 32px 32px;">
          <p style="margin:0;font-size:14px;line-height:1.9;color:#5a5a62;">
            このレポートは、あなたという奇跡の50ページ以上分。<br>
            何度も読み返してほしい。<br>
            1年後にもう一度開くと、違うところが響く。
          </p>
          <p style="margin:20px 0 0 0;font-size:13px;color:#8a8a93;">
            — DNA SHINDAN AI
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 28px 32px;">
          <hr style="border:none;border-top:1px solid #ececec;margin:0;">
          <p style="margin:16px 0 0 0;font-size:11px;color:#a0a0a8;line-height:1.7;">
            ※このメールはDNA診断AIから自動配信されています。<br>
            ※レポートURLはあなた専用のリンクです。
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

// ============================================================================
// 進捗中断リマインダー (24h 後送信・骨格のみ)
// ============================================================================

export interface ProgressReminderTemplateInput {
  fullName: string | null;
  /** 診断再開 URL */
  resumeUrl: string;
  /** 直近で何問まで進んでいたか (任意) */
  lastStep?: number;
  totalSteps?: number;
}

export function renderProgressReminderEmail(
  input: ProgressReminderTemplateInput,
): RenderedEmail {
  const name = honorific(input.fullName);
  const subject = `【ライフDNA】${name.replace(/さん$/, '')}さん、続きはここから再開できます`;

  const progress =
    input.lastStep && input.totalSteps
      ? `（${input.lastStep}問 / ${input.totalSteps}問まで進んでいました）`
      : '';

  const text = [
    name,
    '',
    '昨日、ライフDNA診断を途中まで進めてくれてありがとう。',
    `続きはこのリンクから再開できます。${progress}`,
    '',
    input.resumeUrl,
    '',
    '所要時間は残り10〜20分くらい。',
    '時間ができたタイミングで、あなたのペースで。',
    '',
    '— DNA SHINDAN AI',
  ].join('\n');

  const html = `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#0b0b0e;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0e;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;">
        <tr><td style="padding:36px 32px;">
          <div style="font-size:12px;letter-spacing:0.18em;color:#8a8a93;">DNA SHINDAN AI</div>
          <h1 style="margin:8px 0 0 0;font-size:20px;color:#1f1f23;font-weight:600;line-height:1.5;">
            ${esc(name)}、続きはここから再開できます
          </h1>
          <p style="margin:20px 0 0 0;font-size:14px;line-height:1.9;color:#3a3a42;">
            昨日、ライフDNA診断を途中まで進めてくれてありがとう。<br>
            続きは下のボタンから再開できます。${esc(progress)}
          </p>
          <a href="${esc(input.resumeUrl)}" style="display:block;text-align:center;background:#1f1f23;color:#ffffff;padding:14px 24px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;margin-top:24px;">続きを再開する</a>
          <p style="margin:24px 0 0 0;font-size:13px;color:#8a8a93;line-height:1.8;">
            所要時間は残り10〜20分くらい。<br>
            時間ができたタイミングで、あなたのペースで。
          </p>
          <p style="margin:20px 0 0 0;font-size:13px;color:#8a8a93;">— DNA SHINDAN AI</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
