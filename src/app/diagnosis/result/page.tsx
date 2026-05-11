'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/diagnosis/_ui';

interface SubmitPayload {
  userInfo?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    birthDate?: string;
    birthTime?: string;
    birthPlaceLabel?: string;
  };
  scoreSnapshot?: unknown;
  selectAnswers?: Record<string, string>;
  narrativeAnswers?: Record<string, string>;
  submittedAt?: string;
}

// useSearchParamsはSuspense境界が必要
function ResultContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubmitPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    // URLのerrorパラメータからサーバー送信失敗を受け取る
    const urlError = searchParams.get('error');
    if (urlError) {
      setSubmitError(decodeURIComponent(urlError));
    }
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('dna-shindan-ai:last-submit');
    if (!raw) {
      setError('診断データが見つかりません。最初からやり直してください。');
      return;
    }
    try {
      setData(JSON.parse(raw) as SubmitPayload);
    } catch {
      setError('診断データの読み込みに失敗しました。');
    }
  }, [searchParams]);

  const downloadJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dna-shindan-${data.userInfo?.firstName ?? 'data'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-navy-deep">
        <Card className="max-w-md w-full text-center space-y-4">
          <p className="text-red-300">{error}</p>
          <Link href="/" className="text-gold underline">最初からやり直す</Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-10 bg-navy-deep">
      <div className="max-w-2xl w-full space-y-5">
        {/* サーバー送信失敗エラー表示（localStorageは保存済みなので再送可能） */}
        {submitError && (
          <Card className="border-red-400/50 bg-red-900/20">
            <h3 className="text-red-300 font-bold text-sm mb-2">送信エラーが発生しました</h3>
            <p className="text-red-200/80 text-xs leading-relaxed mb-3">{submitError}</p>
            <p className="text-offwhite-dim text-xs">
              診断データはこのブラウザに保存されています。
              インターネット接続を確認してから
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-gold underline ml-1"
              >
                ページを再読み込み
              </button>
              してください。解決しない場合は
              <a href="mailto:mail@yoz.jp" className="text-gold underline ml-1">mail@yoz.jp</a>
              にご連絡ください。
            </p>
          </Card>
        )}
        {/* 完了 */}
        <Card className="text-center space-y-5 relative overflow-hidden">
          <div className="absolute -inset-1 bg-gradient-to-br from-gold/20 via-transparent to-gold/10 pointer-events-none" />
          <div className="relative space-y-5">
            <div className="flex items-center justify-center pt-3">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-gold/15" />
                <div className="absolute inset-3 rounded-full bg-gold/25" />
                <div className="absolute inset-6 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                  <span className="text-navy-deep text-xl font-bold">✓</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-gold text-xs tracking-[0.4em] uppercase">Diagnosis Submitted</p>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                診断データを<span className="text-gold">お預かり</span>しました
              </h1>
              {(data?.userInfo?.firstName || data?.userInfo?.lastName) && (
                <p className="text-sm text-offwhite-dim">
                  {[data.userInfo.lastName, data.userInfo.firstName].filter(Boolean).join(' ')} さん、ありがとうございました
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* 完成次第お届け */}
        <Card>
          <p className="text-sm text-offwhite leading-relaxed">
            レポートPDFと分身AIボットを生成中です。<strong className="text-gold">完成次第、</strong>
            {data?.userInfo?.email ? (
              <span className="text-gold font-bold"> {data.userInfo.email} </span>
            ) : 'ご登録のメールアドレス '}
            宛にお届けします（目安30分〜1時間）。
          </p>
        </Card>

        {/* その場でデータをダウンロード */}
        <Card>
          <h3 className="text-sm font-bold text-gold mb-3">診断データをいまダウンロード</h3>
          <p className="text-xs text-offwhite-dim mb-3 leading-relaxed">
            あなたが入力した全データをJSONファイルとして保存できます。後日の参照や、別端末への移行に使えます。
          </p>
          <button
            onClick={downloadJSON}
            disabled={!data}
            className="w-full bg-gold/15 border border-gold/40 text-gold px-4 py-3 rounded-lg hover:bg-gold/25 disabled:opacity-40"
          >
            診断データJSONをダウンロード
          </button>
        </Card>

        <p className="text-xs text-offwhite-dim/60 text-center pt-2">
          お問い合わせ：
          <a href="mailto:mail@yoz.jp" className="text-gold underline">mail@yoz.jp</a>
        </p>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-navy-deep">
        <p className="text-offwhite-dim text-sm">読み込み中...</p>
      </main>
    }>
      <ResultContent />
    </Suspense>
  );
}
