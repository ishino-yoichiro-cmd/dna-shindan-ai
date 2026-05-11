import Link from 'next/link';

/**
 * 11プロダクト共通 404 ページ。
 * 各プロダクトで文言・色を上書きして使う。
 */
export default function NotFound() {
  return (
    <main
      role="main"
      aria-labelledby="not-found-heading"
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
      <h1 id="not-found-heading" style={{ fontSize: '4rem', margin: 0 }}>
        404
      </h1>
      <p style={{ fontSize: '1.125rem', marginTop: '0.5rem', opacity: 0.8 }}>
        お探しのページは見つかりませんでした
      </p>
      <Link
        href="/"
        style={{
          marginTop: '2rem',
          padding: '0.75rem 1.5rem',
          border: '1px solid #fff',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '4px',
        }}
      >
        トップへ戻る
      </Link>
    </main>
  );
}
