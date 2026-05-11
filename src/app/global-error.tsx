'use client';

/**
 * 11プロダクト共通 ルート エラー境界（layout.tsx 自体が壊れた時用）。
 * Next.js App Router の最後の砦。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <h1 style={{ fontSize: '2rem' }}>申し訳ありません。重大なエラーが発生しました</h1>
          <p style={{ opacity: 0.7 }}>
            ページの再読み込みをお試しください。
          </p>
          {error.digest && (
            <code style={{ opacity: 0.5, fontSize: '0.75rem' }}>診断コード: {error.digest}</code>
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
      </body>
    </html>
  );
}
