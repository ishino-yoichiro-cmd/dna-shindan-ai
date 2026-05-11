/**
 * Sentry Server (Edge/Node) 設定。
 * SENTRY_DSN または NEXT_PUBLIC_SENTRY_DSN が未設定の場合は no-op。
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    // request body は記録しない（PII 漏洩リスク）
    maxValueLength: 250,
    beforeSend(event) {
      const json = JSON.stringify(event);
      const masked = json
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<email>')
        .replace(/0\d{1,4}-\d{1,4}-\d{4}/g, '<phone>')
        .replace(/[A-Za-z0-9_]{32,}/g, '<token>');
      return JSON.parse(masked);
    },
  });
}
