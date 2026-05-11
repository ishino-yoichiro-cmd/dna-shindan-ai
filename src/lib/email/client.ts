/**
 * DNA診断AI — Resend クライアント (メール送信)
 *
 * - サーバ専用 (RESEND_API_KEY は絶対にクライアント露出させない)
 * - Route Handler / Server Action / Edge Function (Node runtime) で利用
 *
 * 環境変数:
 *   RESEND_API_KEY    必須
 *   RESEND_FROM       必須 (例: "DNA診断AI <noreply@dna-shindan.ai>")
 *   RESEND_REPLY_TO   任意 (例: yoisno@gmail.com)
 */

import { Resend } from 'resend';

let cached: Resend | null = null;

export function getResendClient(): Resend {
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      '[email/client] RESEND_API_KEY が未設定です。.env.local もしくは Vercel の環境変数を確認してください。',
    );
  }

  cached = new Resend(apiKey);
  return cached;
}

export interface ResendEnv {
  from: string;
  replyTo: string | null;
}

export function getResendEnv(): ResendEnv {
  const from = process.env.RESEND_FROM;
  if (!from) {
    throw new Error(
      '[email/client] RESEND_FROM が未設定です。例: "DNA診断AI <noreply@dna-shindan.ai>"',
    );
  }
  return {
    from,
    replyTo: process.env.RESEND_REPLY_TO ?? null,
  };
}
