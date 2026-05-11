'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { STORAGE_KEY_LAST_SUBMIT, STORAGE_KEY_ME_PW_PREFIX } from '@/lib/store/types';

// URL または UUID文字列からdiagnosis IDを抽出する
function extractId(input: string): string {
  const trimmed = input.trim();
  const uuidMatch = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return uuidMatch ? uuidMatch[0] : trimmed;
}

function MatchPageInner() {
  const searchParams = useSearchParams();
  const targetIdFromParam = searchParams.get('target') ?? '';

  const [selfUrl, setSelfUrl] = useState('');
  const [selfPassword, setSelfPassword] = useState('');
  const [targetUrl, setTargetUrl] = useState(
    targetIdFromParam ? `https://dna-shindan-ai.vercel.app/clone/${targetIdFromParam}` : ''
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [targetName, setTargetName] = useState<string>('相手');
  const [error, setError] = useState<string | null>(null);

  const selfId = extractId(selfUrl);
  const targetId = extractId(targetUrl);

  // localStorage から自分のidとパスワードを自動取得
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const last = window.localStorage.getItem(STORAGE_KEY_LAST_SUBMIT);
    if (last) {
      try {
        const data = JSON.parse(last) as { diagnosisId?: string };
        if (data.diagnosisId) {
          setSelfUrl(`https://dna-shindan-ai.vercel.app/clone/${data.diagnosisId}`);
        }
      } catch {}
    }
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(STORAGE_KEY_ME_PW_PREFIX));
    if (keys.length > 0) {
      const id = keys[0].replace(STORAGE_KEY_ME_PW_PREFIX, '');
      if (!selfUrl) setSelfUrl(`https://dna-shindan-ai.vercel.app/clone/${id}`);
      const pw = window.localStorage.getItem(keys[0]) ?? '';
      setSelfPassword(pw);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfId || !targetId) { setError('あなたと相手の分身AIボットURLが必要です'); return; }
    setLoading(true); setError(null);
    const r = await fetch('/api/match', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ selfId, selfPassword, targetId }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? '相性診断に失敗しました');
      setLoading(false);
      return;
    }
    const data = await r.json() as { content: string; targetName?: string };
    setResult(data.content);
    setTargetName(data.targetName ?? '相手');
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-navy-deep via-navy to-navy-deep text-offwhite px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-gold text-xs tracking-[0.4em] uppercase">Compatibility</p>
          <h1 className="text-2xl sm:text-3xl font-bold">相性診断</h1>
          <p className="text-sm text-offwhite-dim">
            {targetName} と あなた の相性を、命術16＋心理スコア＋あなたの記述を統合して読み解きます。
          </p>
        </header>

        {!result ? (
          <form onSubmit={onSubmit} className="bg-navy-soft/40 border border-gold/30 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-offwhite-dim mb-2">あなたの分身AIボットURL</label>
              <input
                type="text"
                value={selfUrl}
                onChange={(e) => setSelfUrl(e.target.value)}
                placeholder="https://dna-shindan-ai.vercel.app/clone/xxxx…"
                className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-offwhite focus:border-gold text-sm"
              />
              <p className="text-xs text-offwhite-dim/70 mt-1.5">メールで届いた分身AIボットのURLをそのまま貼り付けてください</p>
            </div>
            <div>
              <label className="block text-sm text-offwhite-dim mb-2">あなたのパスワード</label>
              <input
                type="password"
                value={selfPassword}
                onChange={(e) => setSelfPassword(e.target.value)}
                placeholder="マイページのパスワード"
                className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-offwhite focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-sm text-offwhite-dim mb-2">相手の分身AIボットURL</label>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://dna-shindan-ai.vercel.app/clone/xxxx…"
                className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-offwhite focus:border-gold text-sm"
              />
              <p className="text-xs text-offwhite-dim/70 mt-1.5">相手から受け取った分身AIボットのURLをそのまま貼り付けてください</p>
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading || !selfId || !targetId || !selfPassword}
              className="w-full bg-gold text-navy-deep font-bold py-3 rounded-lg hover:bg-gold-light disabled:opacity-40"
            >
              {loading ? '診断中…（最大3分）' : 'この人との相性を診断する'}
            </button>
            <p className="text-xs text-offwhite-dim/70">
              ※ 結果は あなたのマイページの「相性診断履歴」にも保存されます。
            </p>
          </form>
        ) : (
          <article className="bg-navy-soft/40 border border-gold/30 rounded-2xl p-6 sm:p-8">
            <div className="prose prose-invert max-w-none text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
              {result}
            </div>
            <div className="mt-6 pt-4 border-t border-gold/20 flex flex-wrap gap-2">
              <Link
                href={selfId ? `/me/${selfId}` : '/'}
                className="border border-gold/40 text-gold px-4 py-2 rounded-lg hover:bg-gold/10 text-sm"
              >
                マイページへ
              </Link>
              <Link
                href={`/clone/${targetId}`}
                className="border border-gold/40 text-gold px-4 py-2 rounded-lg hover:bg-gold/10 text-sm"
              >
                {targetName}の分身AI
              </Link>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center text-offwhite-dim">読み込み中…</main>}>
      <MatchPageInner />
    </Suspense>
  );
}
