/**
 * Next.js 13.4+ instrumentation hook。
 * Edge / Node の実行コンテキストに応じて Sentry を初期化。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export async function onRequestError(...args: any[]) {
  const Sentry = await import('@sentry/nextjs');
  // @ts-expect-error - signature differs across Sentry versions
  return Sentry.captureRequestError?.(...args);
}
