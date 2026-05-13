'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface Props {
  params: Promise<{ id: string }>;
}

interface AuthState {
  firstName?: string;
  lastName?: string;
  status?: string;
  hasPdf?: boolean;
  cloneUrl?: string;
}

interface MatchEntry {
  target_id: string;
  target_name: string;
  created_at: string;
  content: string;
}

export default function MyPage({ params }: Props) {
  const { id } = use(params);
  const [phase, setPhase] = useState<'loading' | 'set-password' | 'login' | 'ready'>('loading');
  const [authed, setAuthed] = useState<AuthState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 公開表示名編集
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savedName, setSavedName] = useState(false);

  // 相性診断履歴
  const [matchHistory, setMatchHistory] = useState<MatchEntry[]>([]);

  // コピー完了フラグ（修正4: R-004）
  const [copied, setCopied] = useState(false);
  const [copiedDna, setCopiedDna] = useState(false);

  // フィードバックフォーム
  const [feedback, setFeedback] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (async () => {
      const url = new URL(window.location.href);
      const token = url.searchParams.get('token');
      const savedPw = window.localStorage.getItem(`me-pw:${id}`);

      if (savedPw) {
        const r = await fetch(`/api/me/${id}/auth`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ password: savedPw }),
        });
        if (r.ok) {
          const data = await r.json();
          setAuthed(data);
          await loadExtended({ password: savedPw });
          setPhase('ready');
          return;
        }
        window.localStorage.removeItem(`me-pw:${id}`);
      }

      if (token) {
        const r = await fetch(`/api/me/${id}/auth`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (r.ok) {
          const data = await r.json();
          if (data.needPassword) {
            setAuthed(data);
            setPhase('set-password');
          } else {
            setAuthed(data);
            await loadExtended({ token: token ?? '' });
            setPhase('ready');
          }
          return;
        }
        setError('リンクが無効か期限切れです。');
      }

      setPhase('login');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadExtended = async (credentials: { token?: string; password?: string }) => {
    // 拡張データ（display_name, match_history）取得
    try {
      const params = new URLSearchParams();
      if (credentials.token) params.set('token', credentials.token);
      if (credentials.password) params.set('password', credentials.password);
      const r = await fetch(`/api/me/${id}/profile?${params.toString()}`);
      if (r.ok) {
        const data = await r.json();
        if (data.cloneDisplayName) setDisplayName(data.cloneDisplayName);
        if (Array.isArray(data.matchHistory)) setMatchHistory(data.matchHistory);
      }
    } catch {}
  };

  const onSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw1.length < 8) { setError('パスワードは8文字以上にしてください。'); return; }
    if (pw1 !== pw2) { setError('確認用パスワードが一致しません。'); return; }
    setSubmitting(true); setError(null);
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const r = await fetch(`/api/me/${id}/auth`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, setPassword: pw1 }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setError(data.error ?? 'パスワード設定に失敗しました');
      setSubmitting(false);
      return;
    }
    window.localStorage.setItem(`me-pw:${id}`, pw1);
    const data = await r.json();
    setAuthed(data);
    await loadExtended({ token: token ?? '' });
    setPhase('ready');
    setSubmitting(false);
    window.history.replaceState({}, '', `/me/${id}`);
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const r = await fetch(`/api/me/${id}/auth`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: pw1 }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setError(data.error === 'password_mismatch' ? 'パスワードが違います' : (data.error ?? 'ログインに失敗しました'));
      setSubmitting(false);
      return;
    }
    window.localStorage.setItem(`me-pw:${id}`, pw1);
    const data = await r.json();
    setAuthed(data);
    await loadExtended({ password: pw1 });
    setPhase('ready');
    setSubmitting(false);
  };

  const saveDisplayName = async () => {
    setSavingName(true); setSavedName(false);
    const pw = window.localStorage.getItem(`me-pw:${id}`) ?? '';
    const r = await fetch(`/api/me/${id}/clone-name`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: pw, displayName }),
    });
    setSavingName(false);
    if (r.ok) setSavedName(true);
  };

  if (phase === 'loading') {
    return <Center><p className="text-offwhite-dim">読み込み中…</p></Center>;
  }

  if (phase === 'set-password') {
    return (
      <Center>
        <form onSubmit={onSetPassword} className="w-full max-w-md space-y-4 p-6 bg-navy-soft/40 border border-gold/30 rounded-2xl">
          <p className="text-gold text-xs tracking-[0.3em] uppercase">First Login</p>
          <h1 className="text-xl font-bold">{authed?.firstName ?? 'あなた'}さん、ようこそ</h1>
          <p className="text-sm text-offwhite-dim leading-relaxed">
            次回からのログイン用パスワードを設定してください（8文字以上）。
            <br />このブラウザに自動保存されます。
          </p>
          <input type="password" placeholder="パスワード" value={pw1} onChange={(e) => setPw1(e.target.value)}
            className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-offwhite focus:border-gold" />
          <input type="password" placeholder="確認用（もう一度）" value={pw2} onChange={(e) => setPw2(e.target.value)}
            className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-offwhite focus:border-gold" />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={submitting}
            className="w-full bg-gold text-navy-deep font-bold py-3 rounded-lg hover:bg-gold-light disabled:opacity-40">
            {submitting ? '設定中…' : 'パスワードを設定して開く'}
          </button>
        </form>
      </Center>
    );
  }

  if (phase === 'login') {
    return (
      <Center>
        <form onSubmit={onLogin} className="w-full max-w-md space-y-4 p-6 bg-navy-soft/40 border border-gold/30 rounded-2xl">
          <p className="text-gold text-xs tracking-[0.3em] uppercase">Sign In</p>
          <h1 className="text-xl font-bold">マイページにログイン</h1>
          <input type="password" placeholder="パスワード" value={pw1} onChange={(e) => setPw1(e.target.value)} autoFocus
            className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-offwhite focus:border-gold" />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={submitting}
            className="w-full bg-gold text-navy-deep font-bold py-3 rounded-lg hover:bg-gold-light disabled:opacity-40">
            {submitting ? '確認中…' : 'ログイン'}
          </button>
          <p className="text-xs text-offwhite-dim/70">パスワードを忘れた場合：メールに記載のURLからアクセスしなおしてください。</p>
        </form>
      </Center>
    );
  }

  // ===== READY =====
  const fullName = [authed?.lastName, authed?.firstName].filter(Boolean).join(' ').trim() || 'あなた';
  const reportReady = authed?.hasPdf === true;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  // authed.cloneUrl はフルURL（http〜）or パス（/clone/...）両形式が来る可能性を吸収
  const rawCloneUrl = authed?.cloneUrl ?? `/clone/${id}`;
  const cloneShareUrl = rawCloneUrl.startsWith('http') ? rawCloneUrl : `${baseUrl}${rawCloneUrl}`;
  // 修正3: H-015 — 本名の代わりに公開表示名を優先使用
  const shareDisplayName = displayName || fullName;

  const onSendFeedback = async () => {
    if (!feedback.trim()) return;
    setFeedbackSending(true);
    setFeedbackError(null);
    try {
      const r = await fetch('/api/me/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ diagnosisId: id, message: feedback }),
      });
      if (r.ok) {
        setFeedbackSent(true);
      } else {
        const data = await r.json().catch(() => ({}));
        setFeedbackError(data.error ?? '送信に失敗しました。');
      }
    } catch {
      setFeedbackError('送信に失敗しました。しばらくして再度お試しください。');
    } finally {
      setFeedbackSending(false);
    }
  };

  const onShare = (text: string, url: string, kind: 'twitter' | 'line' | 'threads' | 'facebook' | 'native') => {
    if (kind === 'native' && typeof navigator !== 'undefined' && 'share' in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).share({ title: 'DNA診断AI', text, url });
      return;
    }
    if (kind === 'twitter') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    if (kind === 'line') window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
    if (kind === 'threads') window.open(`https://www.threads.net/intent/post?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    if (kind === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-navy-deep via-navy to-navy-deep text-offwhite px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="space-y-1">
          <p className="text-gold text-xs tracking-[0.4em] uppercase">My Page</p>
          <h1 className="text-2xl sm:text-3xl font-bold">{fullName} さん</h1>
          <p className="text-sm text-offwhite-dim">DNA診断AI マイページ</p>
        </header>

        {/* AI接続案内（最重要・最初に出す） */}
        <div className="rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-gold/15 to-transparent p-5 sm:p-6">
          <p className="text-gold text-base sm:text-lg font-bold tracking-wide mb-3">このレポートの正しい活用法</p>
          <p className="text-sm sm:text-base text-offwhite leading-relaxed">
            この診断結果のPDFを、Claude Code などのAIエージェントに渡して「この情報を元に自分の分身AIを構築して、今後、自分の理想や目標が最短で実現されるようパートナーとして伴走してください」と伝えましょう。その瞬間からAIは、面白いほどあなたのことを理解してくれて、賢くなって、すべての話が通じやすくなります。
          </p>
        </div>

        {/* レポート */}
        <Card>
          <h2 className="text-lg font-bold text-gold mb-3">DNA診断レポート</h2>
          {reportReady ? (
            <>
              <a
                href={`/api/me/${id}/pdf?password=${encodeURIComponent(window.localStorage.getItem(`me-pw:${id}`) ?? '')}`}
                className="block w-full text-center bg-gold text-navy-deep font-bold py-3 rounded-lg hover:bg-gold-light"
              >
                PDFをダウンロード
              </a>
              <p className="text-xs text-offwhite-dim mt-3">命術16・心理スコア・あなたの記述を統合した50ページ以上の統合レポート。</p>
            </>
          ) : (
            <div className="p-4 rounded-lg bg-navy-deep/40 border border-offwhite-dim/15 text-sm">
              生成中 — 完成まで残り数分です。完了したらこのページをリロードしてください。
            </div>
          )}
        </Card>

        {/* 分身AI */}
        <Card>
          <h2 className="text-lg font-bold text-gold mb-3">分身AIボット</h2>
          {reportReady ? (
            <>
              <div className="text-sm leading-relaxed mb-4 space-y-3">
                <p className="font-bold text-offwhite text-base">分身ボットの使い方</p>
                <div>
                  <p className="font-bold text-gold">１ ご自身をさらに深掘りする</p>
                  <p className="text-offwhite-dim/90 text-xs mt-0.5 pl-1">あなたがまだ気づいていないあなた自身のことを探求してみてください。</p>
                </div>
                <div>
                  <p className="font-bold text-gold">２ 仕事仲間やチームに共有する</p>
                  <p className="text-offwhite-dim/90 text-xs mt-0.5 pl-1">自分の取り扱い方を知ってもらえることで、より深い関係性を築くことができます。</p>
                </div>
                <div>
                  <p className="font-bold text-gold">３ パートナーやご友人と共有する</p>
                  <p className="text-offwhite-dim/90 text-xs mt-0.5 pl-1">今まで以上に自分の深層を理解してもらうことで、より濃い付き合いができます。</p>
                </div>
              </div>
              <a
                href={authed?.cloneUrl ?? `/clone/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-gold text-navy-deep font-bold py-3 rounded-lg hover:bg-gold-light"
              >
                分身AIに話しかける
              </a>
              <div className="mt-5 space-y-2">
                <label className="block text-xs text-offwhite-dim">公開時の表示名（本名を出したくない時）</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`空欄なら「${fullName}」になる`}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={30}
                    className="flex-1 bg-navy-deep/60 border border-gold/30 rounded-lg px-3 py-2 text-sm text-offwhite focus:border-gold"
                  />
                  <button
                    type="button"
                    onClick={saveDisplayName}
                    disabled={savingName}
                    className="bg-gold text-navy-deep font-bold px-3 py-2 rounded-lg text-sm hover:bg-gold-light disabled:opacity-40"
                  >
                    {savingName ? '保存中…' : '保存'}
                  </button>
                </div>
                {savedName && <p className="text-xs text-gold">保存しました（分身AIページのタイトルに反映）</p>}
              </div>
            </>
          ) : (
            <p className="text-sm text-offwhite-dim">レポート完成後に有効化されます。</p>
          )}
        </Card>

        {/* シェア */}
        {reportReady && (
          <Card>
            <h2 className="text-lg font-bold text-gold mb-3">分身AIをシェアしてみませんか？</h2>
            <div className="text-sm text-offwhite leading-relaxed mb-4 space-y-3">
              <p>
                仕事の仲間・友人や家族に、分身AIのURLを渡して、自分のことをもっと知ってもらいましょう。
                自分の正体を知ってもらうことで、お互いの特性がわかり、さらに関係性を構築しやすくなります。
              </p>
              <p>
                パートナー関係においても、お互いが直接聞きづらいことも分身AIボットに確認できてしまうため、高い効果を発揮します。
              </p>
              <p>相手も診断をやれば双方の相性も見ることができます。</p>
              <p className="text-xs text-offwhite-dim">
                ※レポート本体は本人だけが閲覧可能で、シェアできるのは「あなたの分身AIへのリンク」のみです。
              </p>
            </div>

            {/* メイン：分身AI URL のシェア */}
            <div className="space-y-2 mb-5">
              <p className="text-xs text-offwhite-dim">分身AIのリンクを友人・仲間・家族に渡す</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <ShareBtn label="X" onClick={() => onShare(`私(${shareDisplayName})の分身AIです。話しかけてみてください。`, cloneShareUrl, 'twitter')} />
                <ShareBtn label="LINE" onClick={() => onShare(`私(${shareDisplayName})の分身AIです。話しかけてみてください。`, cloneShareUrl, 'line')} />
                <ShareBtn label="Facebook" onClick={() => onShare(`私(${shareDisplayName})の分身AIです。話しかけてみてください。`, cloneShareUrl, 'facebook')} />
                <ShareBtn label="Threads" onClick={() => onShare(`私(${shareDisplayName})の分身AIです。話しかけてみてください。`, cloneShareUrl, 'threads')} />
                <ShareBtn label="その他" onClick={() => onShare(`私(${shareDisplayName})の分身AIです。話しかけてみてください。`, cloneShareUrl, 'native')} />
              </div>
              <div className="flex gap-2 mt-2 items-center">
                <input readOnly value={cloneShareUrl}
                  className="flex-1 bg-navy-deep/60 border border-gold/30 rounded-lg px-3 py-2 text-xs text-offwhite-dim" />
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(cloneShareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="bg-gold text-navy-deep font-bold px-3 py-2 rounded-lg text-xs hover:bg-gold-light"
                >
                  コピー
                </button>
                {copied && <span className="text-xs text-gold">コピーしました</span>}
              </div>
            </div>

          </Card>
        )}

        {/* DNA診断紹介 */}
        {reportReady && (
          <Card>
            <h2 className="text-lg font-bold text-gold mb-3">分身AIが役に立ったらDNA診断を紹介してください</h2>
            <p className="text-sm text-offwhite-dim leading-relaxed mb-4">
              DNA診断は、Claude Codeが飛躍的に賢くなる分身AIを、1人でも多くの方に活用していただきたくて、API費用も自己負担しながら無料で公開をしています。分身AIでClaudeCodeが賢くなったと思われたり、分身AIボットがお役に立てた場合には、是非このDNA診断を、ご友人の経営者にも伝えてあげてください。
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              <ShareBtn label="X" onClick={() => onShare('DNA診断AIで、自分の分身AIを作る診断を受けた。ClaudeCodeが飛躍的に賢くなるのでおすすめ。', baseUrl, 'twitter')} />
              <ShareBtn label="LINE" onClick={() => onShare('DNA診断AIで、自分の分身AIを作る診断を受けた。ClaudeCodeが飛躍的に賢くなるのでおすすめ。', baseUrl, 'line')} />
              <ShareBtn label="Facebook" onClick={() => onShare('DNA診断AIで、自分の分身AIを作る診断を受けた。ClaudeCodeが飛躍的に賢くなるのでおすすめ。', baseUrl, 'facebook')} />
              <ShareBtn label="Threads" onClick={() => onShare('DNA診断AIで、自分の分身AIを作る診断を受けた。ClaudeCodeが飛躍的に賢くなるのでおすすめ。', baseUrl, 'threads')} />
              <ShareBtn label="その他" onClick={() => onShare('DNA診断AIで、自分の分身AIを作る診断を受けた。ClaudeCodeが飛躍的に賢くなるのでおすすめ。', baseUrl, 'native')} />
            </div>
            <div className="flex gap-2 items-center">
              <input readOnly value={baseUrl}
                className="flex-1 bg-navy-deep/60 border border-gold/30 rounded-lg px-3 py-2 text-xs text-offwhite-dim" />
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(baseUrl); setCopiedDna(true); setTimeout(() => setCopiedDna(false), 2000); }}
                className="bg-gold text-navy-deep font-bold px-3 py-2 rounded-lg text-xs hover:bg-gold-light"
              >
                コピー
              </button>
              {copiedDna && <span className="text-xs text-gold">コピーしました</span>}
            </div>
          </Card>
        )}

        {/* 感想フォーム */}
        {reportReady && (
          <Card>
            <h2 className="text-lg font-bold text-gold mb-3">診断レポート・分身AI・分身AIボットについての感想をお聞かせください</h2>
            {feedbackSent ? (
              <div className="space-y-4">
                <p className="text-sm text-offwhite leading-relaxed">
                  貴重なご意見ありがとうございます。今後の開発に活かさせていただきます。
                </p>
                <div className="bg-gold/10 border border-gold/40 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-offwhite leading-relaxed">
                    感想をご提出いただいた方には、<br />
                    <strong className="text-gold">「ClaudeCode初心者が初日に設定すべき7つの神設定」</strong><br />
                    もプレゼントさせていただきます。
                  </p>
                  <a
                    href="https://bit.ly/tips7"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-gold text-navy-deep font-bold py-3 rounded-lg text-sm hover:bg-gold-light"
                  >
                    プレゼントを受け取る
                  </a>
                  <p className="text-xs text-offwhite-dim/70 leading-relaxed">
                    ご活用いただきClaudeCodeをより使いこなしていただけたら嬉しいです。<br />
                    次回の神プロダクトのご案内もお楽しみに。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFeedbackSent(false); setFeedback(''); }}
                  className="w-full border border-gold/40 text-gold py-2 rounded-lg text-sm hover:bg-gold/10"
                >
                  再投稿する
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  placeholder="診断レポート・分身AI・分身AIボットの使い心地、気づいたこと、改善のご提案など、何でもお気軽にどうぞ。"
                  className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-sm text-offwhite placeholder-offwhite-dim/40 focus:border-gold resize-none"
                />
                {feedbackError && <p className="text-xs text-red-300">{feedbackError}</p>}
                <button
                  type="button"
                  onClick={onSendFeedback}
                  disabled={feedbackSending || !feedback.trim()}
                  className="w-full bg-gold text-navy-deep font-bold py-3 rounded-lg hover:bg-gold-light disabled:opacity-40 text-sm"
                >
                  {feedbackSending ? '送信中…' : '送信する'}
                </button>
              </div>
            )}
          </Card>
        )}

        {/* 相性診断履歴 */}
        {reportReady && matchHistory.length > 0 && (
          <Card>
            <h2 className="text-lg font-bold text-gold mb-3">相性診断履歴</h2>
            <div className="space-y-3">
              {matchHistory.map((m, i) => (
                <details key={i} className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
                  <summary className="cursor-pointer text-sm flex items-center justify-between">
                    <span className="text-offwhite font-bold">{m.target_name}</span>
                    <span className="text-xs text-offwhite-dim/60">{m.created_at.slice(0, 10)}</span>
                  </summary>
                  <div className="mt-3 text-sm text-offwhite-dim/90 whitespace-pre-wrap leading-relaxed">
                    {m.content}
                  </div>
                </details>
              ))}
            </div>
          </Card>
        )}

        <p className="text-xs text-offwhite-dim/50 text-center pt-2 leading-relaxed">
          ※無償ベータ版につき動作の保証はありません。分身ボットの公開は自己責任でお願いします。
        </p>
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-navy-soft/40 border border-gold/20 rounded-2xl p-5 sm:p-6">{children}</div>;
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-navy-deep text-offwhite">
      {children}
    </main>
  );
}

function ShareBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="border border-gold/30 text-offwhite text-xs py-2 rounded-lg hover:bg-gold/10 hover:border-gold/60">
      {label}
    </button>
  );
}
