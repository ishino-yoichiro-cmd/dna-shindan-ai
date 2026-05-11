/**
 * Sentry Client (Browser) 設定。
 * NEXT_PUBLIC_SENTRY_DSN が未設定の場合は no-op（無料枠の温存）。
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    // PII redaction（feedback_no_real_name の延長）
    sendDefaultPii: false,
    beforeSend(event) {
      // メール・電話・本名らしきものをマスク
      const json = JSON.stringify(event);
      const masked = json
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<email>')
        .replace(/0\d{1,4}-\d{1,4}-\d{4}/g, '<phone>');
      return JSON.parse(masked);
    },
  });
}
