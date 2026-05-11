'use client';

import { useEffect } from 'react';

/**
 * 11プロダクト共通 エラー境界。
 * クライアント側のレンダリング/データ取得エラーを補足。
 * エラー文言は必ず日本語（feedback_japanese_errors_only）。
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ここで Sentry 等に送信（後続Phaseで統合）
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[error.tsx]', error);
    }
  }, [error]);

  return (
    <main
      role="main"
      aria-labelledby="err-heading"
      aria-live="assertive"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#000',
        color: '#fff',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif',
      }}
    >
      <h1 id="err-heading" style={{ fontSize: '2rem', margin: 0 }}>
        申し訳ありません。エラーが発生しました
      </h1>
      <p style={{ marginTop: '1rem', opacity: 0.7, fontSize: '0.875rem' }}>
        サーバ側で原因を確認しています。少し時間を置いてから再度お試しください。
      </p>
      {error.digest && (
        <code style={{ marginTop: '1rem', opacity: 0.5, fontSize: '0.75rem' }}>
          診断コード: {error.digest}
        </code>
      )}
      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          background: '#fff',
          color: '#000',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        もう一度試す
      </button>
    </main>
  );
}
