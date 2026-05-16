'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { DEFAULT_MYPAGE_LAYOUT, type MyPageLayout, type MyPageSectionKey } from '@/lib/mypage-layout';
import EditNarrativeCard from '@/components/me/EditNarrativeCard';

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

  // 全員共通マイページレイアウト（admin で編集可能）
  const [layout, setLayout] = useState<MyPageLayout>(DEFAULT_MYPAGE_LAYOUT);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/mypage-layout')
      .then(r => r.json())
      .then(d => { if (!cancelled && d?.ok && d.layout) setLayout(d.layout); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // PDF認証用トークン（token URLでの認証時に保存 → passwordが無い端末でのDLに使用）
  const [authToken, setAuthToken] = useState('');

  // コピー完了フラグ（修正4: R-004）
  const [copied, setCopied] = useState(false);
  const [copiedDna, setCopiedDna] = useState(false);

  // フィードバックフォーム
  const [feedback, setFeedback] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackEverSent, setFeedbackEverSent] = useState(false); // localStorage 永続
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // 初回マウント時: 過去に送信済みか確認
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      const sent = window.localStorage.getItem(`dna-feedback-sent:${id}`) === '1';
      if (sent) {
        setFeedbackEverSent(true);
        setFeedbackSent(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
          // トークンを state に保存（localStorage pw が無い端末でのPDFダウンロードに使用）
          setAuthToken(token);
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
  // PDFダウンロードURL: localStorage pw優先、なければ token（メールリンク経由の端末対応）
  const savedPw = typeof window !== 'undefined' ? (window.localStorage.getItem(`me-pw:${id}`) ?? '') : '';
  const pdfDownloadHref = savedPw
    ? `/api/me/${id}/pdf?password=${encodeURIComponent(savedPw)}`
    : `/api/me/${id}/pdf?token=${encodeURIComponent(authToken)}`;
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
        setFeedbackEverSent(true);
        if (typeof window !== 'undefined' && id) {
          window.localStorage.setItem(`dna-feedback-sent:${id}`, '1');
        }
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

  // セクションタイトル・内部フィールド参照（admin で編集された値を採用、無ければ default）
  const titleOf = (key: string, fallback: string) =>
    layout.sections.find(s => s.key === key)?.title ?? fallback;
  const fOf = (key: MyPageSectionKey, fk: string, fb = '') =>
    layout.sections.find(s => s.key === key)?.fields?.[fk] ?? fb;
  // share / referral の {name} プレースホルダ展開
  const shareMsgFor = (template: string) => template.replace(/\{name\}/g, shareDisplayName);

  // 各セクションを key -> JSX に切り出し（順序・表示は layout.sections で制御）
  const sectionMap: Record<string, React.ReactNode> = {
    report: (
      <Card>
        <h2 className="text-lg font-bold text-gold mb-3">{titleOf('report', 'DNA診断レポート')}</h2>
        {reportReady ? (
          <>
            <a
              href={pdfDownloadHref}
              className="block w-full text-center bg-gold text-navy-deep font-bold py-3 rounded-lg hover:bg-gold-light"
            >
              {fOf('report', 'ctaLabel', 'PDFをダウンロード')}
            </a>
            <p className="text-xs text-offwhite-dim mt-3 whitespace-pre-wrap">{fOf('report', 'description')}</p>
          </>
        ) : (
          <div className="p-4 rounded-lg bg-navy-deep/40 border border-offwhite-dim/15 text-sm whitespace-pre-wrap">
            {fOf('report', 'pendingMessage')}
          </div>
        )}
      </Card>
    ),
    clone: (
      <Card>
        <h2 className="text-lg font-bold text-gold mb-3">{titleOf('clone', '分身AIボット')}</h2>
        {reportReady ? (
          <>
            <div className="text-sm leading-relaxed mb-4 space-y-3">
              {(fOf('clone', 'diffHeading') || fOf('clone', 'diffBody')) && (
                <div className="border border-gold/30 rounded-lg p-3 bg-navy-deep/40">
                  {fOf('clone', 'diffHeading') && (
                    <p className="font-bold text-gold text-sm mb-1.5">{fOf('clone', 'diffHeading')}</p>
                  )}
                  {fOf('clone', 'diffBody') && (
                    <p className="text-offwhite-dim/90 text-xs leading-relaxed whitespace-pre-wrap">{fOf('clone', 'diffBody')}</p>
                  )}
                </div>
              )}
              {fOf('clone', 'howToHeading') && (
                <p className="font-bold text-offwhite text-base">{fOf('clone', 'howToHeading')}</p>
              )}
              {[1, 2, 3].map(n => {
                const t = fOf('clone', `step${n}Title`);
                const b = fOf('clone', `step${n}Body`);
                if (!t && !b) return null;
                return (
                  <div key={n}>
                    {t && <p className="font-bold text-gold">{t}</p>}
                    {b && <p className="text-offwhite-dim/90 text-xs mt-0.5 pl-1 whitespace-pre-wrap">{b}</p>}
                  </div>
                );
              })}
            </div>

            <a
              href={authed?.cloneUrl ?? `/clone/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-gold text-navy-deep font-bold py-3 rounded-lg hover:bg-gold-light"
            >
              {fOf('clone', 'ctaLabel', '分身AIに話しかける')}
            </a>
            <div className="mt-5 space-y-2">
              <label className="block text-xs text-offwhite-dim">{fOf('clone', 'displayNameLabel')}</label>
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
              {savedName && <p className="text-xs text-gold">{fOf('clone', 'savedMessage')}</p>}
            </div>
          </>
        ) : (
          <p className="text-sm text-offwhite-dim">{fOf('clone', 'lockedMessage')}</p>
        )}
      </Card>
    ),
    share: reportReady ? (
      <Card>
        <h2 className="text-lg font-bold text-gold mb-3">{titleOf('share', '分身AIボットをシェアしてみませんか？')}</h2>
        <div className="text-sm text-offwhite leading-relaxed mb-4 space-y-3">
          {['body1', 'body2', 'body3'].map(k => {
            const v = fOf('share', k);
            return v ? <p key={k} className="whitespace-pre-wrap">{v}</p> : null;
          })}
          {fOf('share', 'securityNote') && (
            <p className="text-xs text-offwhite-dim whitespace-pre-wrap">{fOf('share', 'securityNote')}</p>
          )}
        </div>
        <div className="space-y-2 mb-5">
          {fOf('share', 'shareLeadText') && (
            <p className="text-xs text-offwhite-dim">{fOf('share', 'shareLeadText')}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <ShareBtn label="X"        onClick={() => onShare(shareMsgFor(fOf('share', 'shareMessage')), cloneShareUrl, 'twitter')} />
            <ShareBtn label="LINE"     onClick={() => onShare(shareMsgFor(fOf('share', 'shareMessage')), cloneShareUrl, 'line')} />
            <ShareBtn label="Facebook" onClick={() => onShare(shareMsgFor(fOf('share', 'shareMessage')), cloneShareUrl, 'facebook')} />
            <ShareBtn label="Threads"  onClick={() => onShare(shareMsgFor(fOf('share', 'shareMessage')), cloneShareUrl, 'threads')} />
            <ShareBtn label="その他"    onClick={() => onShare(shareMsgFor(fOf('share', 'shareMessage')), cloneShareUrl, 'native')} />
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
    ) : null,
    referral: reportReady ? (
      <Card>
        <h2 className="text-lg font-bold text-gold mb-3">{titleOf('referral', 'ご友人にもDNA診断を紹介してあげてください')}</h2>
        {fOf('referral', 'body') && (
          <p className="text-sm text-offwhite-dim leading-relaxed mb-4 whitespace-pre-wrap">{fOf('referral', 'body')}</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <ShareBtn label="X"        onClick={() => onShare(fOf('referral', 'shareMessage'), baseUrl, 'twitter')} />
          <ShareBtn label="LINE"     onClick={() => onShare(fOf('referral', 'shareMessage'), baseUrl, 'line')} />
          <ShareBtn label="Facebook" onClick={() => onShare(fOf('referral', 'shareMessage'), baseUrl, 'facebook')} />
          <ShareBtn label="Threads"  onClick={() => onShare(fOf('referral', 'shareMessage'), baseUrl, 'threads')} />
          <ShareBtn label="その他"    onClick={() => onShare(fOf('referral', 'shareMessage'), baseUrl, 'native')} />
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
    ) : null,
    feedback: reportReady ? (
      <Card>
        <h2 className="text-lg font-bold text-gold mb-3">{titleOf('feedback', '診断レポート・分身AI・分身AIボットについての感想をお聞かせください')}</h2>
        {feedbackSent ? (
          <div className="space-y-4">
            <p className="text-sm text-offwhite leading-relaxed whitespace-pre-wrap">{fOf('feedback', 'sentThanks')}</p>
            <div className="bg-gold/10 border border-gold/40 rounded-xl p-5 space-y-4">
              <p className="text-sm text-offwhite leading-relaxed">
                {fOf('feedback', 'giftPrefix')}<br />
                <strong className="text-gold">{fOf('feedback', 'giftHighlight')}</strong><br />
                {fOf('feedback', 'giftSuffix')}
              </p>
              {fOf('feedback', 'giftUrl') && (
                <a
                  href={fOf('feedback', 'giftUrl')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center bg-gold text-navy-deep font-bold py-3 rounded-lg text-sm hover:bg-gold-light"
                >
                  {fOf('feedback', 'giftButtonLabel', 'プレゼントを受け取る')}
                </a>
              )}
              {fOf('feedback', 'giftPostText') && (
                <p className="text-xs text-offwhite-dim/70 leading-relaxed whitespace-pre-wrap">{fOf('feedback', 'giftPostText')}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setFeedbackSent(false); setFeedback(''); }}
              className="w-full border border-gold/40 text-gold py-2 rounded-lg text-sm hover:bg-gold/10"
            >
              {fOf('feedback', 'replyAgainLabel', '再投稿する')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder={fOf('feedback', 'placeholder')}
              className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-sm text-offwhite placeholder-offwhite-dim/40 focus:border-gold resize-none"
            />
            {feedbackError && <p className="text-xs text-red-300">{feedbackError}</p>}
            <button
              type="button"
              onClick={onSendFeedback}
              disabled={feedbackSending || !feedback.trim()}
              className="w-full bg-gold text-navy-deep font-bold py-3 rounded-lg hover:bg-gold-light disabled:opacity-40 text-sm"
            >
              {feedbackSending ? '送信中…' : fOf('feedback', 'submitLabel', '送信する')}
            </button>
          </div>
        )}
      </Card>
    ) : null,
    match: reportReady && matchHistory.length > 0 ? (
      <Card>
        <h2 className="text-lg font-bold text-gold mb-3">{titleOf('match', '相性診断履歴')}</h2>
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
    ) : null,
    'edit-narrative': (
      <Card>
        <h2 className="text-lg font-bold text-gold mb-3">{titleOf('edit-narrative', '回答を編集・追記する')}</h2>
        <EditNarrativeCard
          id={id}
          credentials={{ token: authToken || undefined, password: savedPw || undefined }}
          status={authed?.status}
        />
      </Card>
    ),
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-navy-deep via-navy to-navy-deep text-offwhite px-4 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="space-y-1">
          <p className="text-gold text-xs tracking-[0.4em] uppercase">{layout.header.label}</p>
          <h1 className="text-2xl sm:text-3xl font-bold">{fullName} さん</h1>
          <p className="text-sm text-offwhite-dim">{layout.header.subtitle}</p>
        </header>

        {/* お知らせブロック（admin で表示制御） */}
        {layout.announcement.visible && (layout.announcement.title || layout.announcement.body) && (
          <div className="rounded-2xl border border-blue-400/40 bg-blue-900/15 p-4 sm:p-5 space-y-2">
            {layout.announcement.title && (
              <p className="text-blue-300 font-bold text-base">{layout.announcement.title}</p>
            )}
            {layout.announcement.body && (
              <p className="text-sm text-offwhite leading-relaxed whitespace-pre-wrap">{layout.announcement.body}</p>
            )}
            {layout.announcement.linkUrl && (
              <a
                href={layout.announcement.linkUrl}
                target="_blank" rel="noopener noreferrer"
                className="inline-block mt-1 text-xs text-blue-300 hover:text-blue-200 underline"
              >
                {layout.announcement.linkText || layout.announcement.linkUrl}
              </a>
            )}
          </div>
        )}

        {/* 導入メッセージ（admin で表示制御） */}
        {layout.intro.visible && (
          <div className="rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-gold/15 to-transparent p-5 sm:p-6">
            <p className="text-gold text-base sm:text-lg font-bold tracking-wide mb-3">{layout.intro.title}</p>
            <p className="text-sm sm:text-base text-offwhite leading-relaxed whitespace-pre-wrap">
              {layout.intro.body}
            </p>
          </div>
        )}

        {/* セクションを layout.sections の順序で表示（visible=false はスキップ） */}
        {layout.sections.map(s => s.visible ? (
          <div key={s.key}>{sectionMap[s.key]}</div>
        ) : null)}

        <p className="text-xs text-offwhite-dim/50 text-center pt-2 leading-relaxed whitespace-pre-wrap">
          {layout.footer.note}
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
