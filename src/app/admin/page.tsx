'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY_ADMIN_PASS = 'dna-shindan-ai:admin-pass';

const RELATION_LABELS: Record<string, string> = {
  mabudachi:        '親友',
  tomodachi:        '友人',
  shiriai:          '知人',
  kyuyu:            '旧友',
  business_partner: 'ビジネスパートナー',
  kazoku:           '家族',
  koibito:          '恋人',
  partner:          'パートナー',
};
const toRelLabel = (tag: string) => RELATION_LABELS[tag] ?? tag;

const STATUS_LABELS: Record<string, string> = {
  completed:  '完了',
  processing: '処理中',
  pending:    '未処理',
  failed:     'エラー',
};
const toStatusLabel = (s: string) => STATUS_LABELS[s] ?? s;

type TabId = 'data' | 'feedbacks' | 'mail' | 'inbox' | 'pages';

interface SubmissionRow {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  status?: string;
  relationship_tag?: string | null;
  download_count?: number;
  chat_count?: number;
  api_cost_usd?: number;
  created_at?: string;
  last_downloaded_at?: string | null;
  last_chat_at?: string | null;
  completed_at?: string | null;
  clone_display_name?: string | null;
  select_answers?: Record<string, string>;
  narrative_answers?: Record<string, string>;
  style_sample?: string;
  scores?: unknown;
  celestial_results?: unknown;
  report_text?: Record<string, string>;
  access_token?: string | null;
  hidden_at?: string | null;
  feedback_count?: number;
}

interface FeedbackRow {
  id: string;
  diagnosis_id: string;
  message: string;
  created_at: string;
  dna_diagnoses?: {
    first_name?: string | null;
    last_name?: string | null;
    clone_display_name?: string | null;
    email?: string | null;
  } | null;
}

interface QuestionDef {
  id: string;
  prompt?: string;
  title?: string;
  choices?: Array<{ id: string; text: string }>;
  type?: string;
}

interface StatsResponse {
  ok: boolean;
  summary: {
    total: number;
    totalCost: number;
    totalDownloads: number;
    totalChats: number;
    apiBudgetUsd: number;
    apiUsagePercent: number;
    apiRemainingUsd: number;
    alert: boolean;
    alertThresholdPercent: number;
  };
  statusBreakdown: Record<string, number>;
  relationBreakdown: Record<string, number>;
  dailyRegistrations: Record<string, number>;
  rows: SubmissionRow[];
}

interface MailState {
  toType: 'completed' | 'all' | 'selected';
  selectedIds: string[];
  subject: string;
  body: string;
  sending: boolean;
  result: { sent: number; failed: number; total: number } | null;
  error: string;
}

interface InboxMessage {
  uid: number;
  messageId: string;
  from: string;
  fromName: string;
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml?: string;
  read: boolean;
}

interface ReplyState {
  to: string;
  subject: string;
  body: string;
  sending: boolean;
  sent: boolean;
  error: string;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [questions, setQuestions] = useState<QuestionDef[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('data');
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState('');
  const [selectedInbox, setSelectedInbox] = useState<InboxMessage | null>(null);
  const [reply, setReply] = useState<ReplyState>({ to: '', subject: '', body: '', sending: false, sent: false, error: '' });
  const [mail, setMail] = useState<MailState>({
    toType: 'completed',
    selectedIds: [],
    subject: '',
    body: '',
    sending: false,
    result: null,
    error: '',
  });

  const handleLogin = async (pw?: string) => {
    const usePw = pw ?? pass;
    if (!usePw) return;
    try {
      const r = await fetch(`/api/admin/stats?pass=${encodeURIComponent(usePw)}`);
      if (r.ok) {
        setStats(await r.json());
        setAuthed(true);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY_ADMIN_PASS, usePw);
        }
      } else if (r.status === 401 || r.status === 403) {
        setLoginError('パスワードが違います');
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(STORAGE_KEY_ADMIN_PASS);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlPass = params.get('pass');
    const savedPass = window.localStorage.getItem(STORAGE_KEY_ADMIN_PASS);
    const autoPass = urlPass ?? savedPass;
    if (autoPass) {
      setPass(autoPass);
      void handleLogin(autoPass);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authed) return;
    void loadStats();
    void loadQuestions();
    void loadFeedbacks();
    const timer = setInterval(() => { void loadStats(); void loadFeedbacks(); }, 60_000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const loadStats = async (forceShowHidden?: boolean) => {
    setLoading(true);
    try {
      const sh = forceShowHidden ?? showHidden;
      const r = await fetch(`/api/admin/stats?pass=${encodeURIComponent(pass)}${sh ? '&show_hidden=1' : ''}`);
      if (r.ok) setStats(await r.json());
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async (id: string, unhide: boolean) => {
    setHidingId(id);
    try {
      const r = await fetch('/api/admin/hide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pass, unhide }),
      });
      if (r.ok) { setSelected(null); await loadStats(); }
    } finally {
      setHidingId(null);
    }
  };

  const handleToggleShowHidden = async () => {
    const next = !showHidden;
    setShowHidden(next);
    await loadStats(next);
  };

  const loadFeedbacks = async () => {
    try {
      const r = await fetch(`/api/admin/feedbacks?pass=${encodeURIComponent(pass)}`);
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.feedbacks)) setFeedbacks(d.feedbacks);
      }
    } catch {}
  };

  const loadQuestions = async () => {
    try {
      const r = await fetch('/api/questions');
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data.questions)) setQuestions(data.questions);
      }
    } catch {}
  };

  const loadInbox = async () => {
    setInboxLoading(true);
    setInboxError('');
    try {
      const r = await fetch(`/api/admin/inbox?pass=${encodeURIComponent(pass)}&limit=50`);
      const d = await r.json();
      if (d.ok) {
        setInboxMessages(d.messages ?? []);
      } else {
        setInboxError(d.error ?? '受信ボックスの取得に失敗しました');
      }
    } catch (e) {
      setInboxError(String(e));
    } finally {
      setInboxLoading(false);
    }
  };

  const openInboxMessage = (msg: InboxMessage) => {
    setSelectedInbox(msg);
    const reSubject = msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`;
    setReply({ to: msg.from, subject: reSubject, body: '', sending: false, sent: false, error: '' });
  };

  const sendReply = async () => {
    if (!reply.body.trim()) return;
    setReply(r => ({ ...r, sending: true, error: '' }));
    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pass,
          to: reply.to,
          subject: reply.subject,
          replyBody: reply.body,
          inReplyTo: selectedInbox?.messageId,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setReply(r => ({ ...r, sent: true, sending: false }));
      } else {
        setReply(r => ({ ...r, error: d.error ?? '送信失敗', sending: false }));
      }
    } catch (e) {
      setReply(r => ({ ...r, error: String(e), sending: false }));
    }
  };

  // メール送信先をIDで個別指定してメールタブに移動
  const openMailForUser = (id: string) => {
    setMail(m => ({ ...m, toType: 'selected', selectedIds: [id], result: null, error: '' }));
    setActiveTab('mail');
  };

  const sendMail = async () => {
    if (!mail.subject.trim() || !mail.body.trim()) {
      setMail(m => ({ ...m, error: '件名と本文を入力してください' }));
      return;
    }
    if (mail.toType === 'selected' && mail.selectedIds.length === 0) {
      setMail(m => ({ ...m, error: '送信先を選択してください' }));
      return;
    }
    setMail(m => ({ ...m, sending: true, error: '', result: null }));
    try {
      const to = mail.toType === 'selected' ? mail.selectedIds : mail.toType;
      const r = await fetch('/api/admin/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass, to, subject: mail.subject, body: mail.body }),
      });
      const d = await r.json();
      if (d.ok) {
        setMail(m => ({ ...m, result: { sent: d.sent, failed: d.failed, total: d.total }, sending: false }));
      } else {
        setMail(m => ({ ...m, error: d.error ?? '送信失敗', sending: false }));
      }
    } catch (e) {
      setMail(m => ({ ...m, error: String(e), sending: false }));
    }
  };

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-navy-deep text-offwhite">
        <div className="max-w-md w-full bg-navy-soft/40 border border-gold/30 rounded-2xl p-8 space-y-4">
          <h1 className="text-xl font-bold text-gold">DNA SHINDAN AI 管理画面</h1>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleLogin(); }}
            placeholder="管理パスワード"
            className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-offwhite focus:border-gold"
          />
          {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
          <button
            type="button"
            onClick={() => void handleLogin()}
            className="w-full bg-gold text-navy-deep font-bold py-3 rounded-lg hover:bg-gold-light"
          >
            ログイン
          </button>
        </div>
      </main>
    );
  }

  if (loading || !stats) {
    return <main className="min-h-screen flex items-center justify-center text-offwhite-dim">読み込み中…</main>;
  }

  const sel = selected !== null ? stats.rows[selected] : null;
  const qMap: Record<string, QuestionDef> = {};
  for (const q of questions) qMap[q.id] = q;

  const dailyApiCost: Record<string, number> = {};
  const dailyDownloads: Record<string, number> = {};
  const dailyRegs14: Record<string, number> = {};
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyApiCost[key] = 0;
    dailyDownloads[key] = 0;
    dailyRegs14[key] = stats.dailyRegistrations[key] ?? 0;
  }
  for (const r of stats.rows) {
    if (r.completed_at) {
      const d = r.completed_at.slice(0, 10);
      if (d in dailyApiCost) dailyApiCost[d] = Number((dailyApiCost[d] + (r.api_cost_usd ?? 0)).toFixed(4));
    }
    if (r.last_downloaded_at && (r.download_count ?? 0) > 0) {
      const d = r.last_downloaded_at.slice(0, 10);
      if (d in dailyDownloads) dailyDownloads[d]++;
    }
  }

  const completedRows = stats.rows.filter(r => r.status === 'completed' && r.email);
  const mailTargetCount =
    mail.toType === 'completed' ? completedRows.length :
    mail.toType === 'all' ? stats.rows.filter(r => r.email).length :
    mail.selectedIds.length;

  const unreadCount = inboxMessages.filter(m => !m.read).length;
  const TABS: { id: TabId; label: string; badge?: number }[] = [
    { id: 'data', label: '診断データ', badge: stats.rows.length },
    { id: 'feedbacks', label: '感想', badge: feedbacks.length },
    { id: 'mail', label: 'メール配信' },
    { id: 'inbox', label: '受信ボックス', badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'pages', label: 'ページ管理' },
  ];

  return (
    <main className="min-h-screen bg-navy-deep text-offwhite px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ヘッダー */}
        <header className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gold/20">
          <h1 className="text-2xl font-bold text-gold">DNA SHINDAN AI 管理</h1>
          <div className="flex items-center gap-2">
            <a
              href="https://supabase.com/dashboard/project/utcsldezxxjeednyxovs/editor"
              target="_blank" rel="noopener noreferrer"
              className="border border-gold/40 text-gold px-3 py-1.5 rounded-lg text-sm hover:bg-gold/10"
            >
              DBを開く
            </a>
            <button
              onClick={() => void handleToggleShowHidden()}
              className={`border px-3 py-1.5 rounded-lg text-sm ${showHidden ? 'border-amber-400/60 text-amber-400 bg-amber-400/10' : 'border-gold/40 text-gold hover:bg-gold/10'}`}
            >
              {showHidden ? '非表示を隠す' : '非表示を表示'}
            </button>
            <button onClick={() => void loadStats()} className="border border-gold/40 text-gold px-3 py-1.5 rounded-lg text-sm hover:bg-gold/10">
              再読み込み
            </button>
          </div>
        </header>

        {/* KPI帯 */}
        <section className={`flex flex-wrap gap-x-6 gap-y-1 items-center px-4 py-3 rounded-xl border text-sm ${stats.summary.alert ? 'border-red-500/50 bg-red-900/10' : 'border-gold/20 bg-navy-soft/30'}`}>
          <MiniKPI label="総数" value={`${stats.summary.total}件`} />
          <MiniKPI label="完了" value={`${stats.statusBreakdown['completed'] ?? 0}件`} accent />
          <MiniKPI label="未完" value={`${stats.summary.total - (stats.statusBreakdown['completed'] ?? 0)}件`} />
          <MiniKPI label="DL" value={`${stats.summary.totalDownloads}回`} />
          <MiniKPI label="Chat" value={`${stats.summary.totalChats}回`} />
          <span className="text-offwhite-dim/30 hidden sm:inline">|</span>
          <MiniKPI label="API" value={`$${stats.summary.totalCost.toFixed(2)} / $${stats.summary.apiBudgetUsd} (${stats.summary.apiUsagePercent}%)`} warn={stats.summary.alert} />
          {stats.summary.alert && <span className="text-red-300 text-xs font-bold">{stats.summary.alertThresholdPercent}%超過</span>}
        </section>

        {/* タブナビゲーション */}
        <nav className="flex gap-1 border-b border-gold/20">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-gold/15 text-gold border border-gold/30 border-b-0 -mb-px'
                  : 'text-offwhite-dim hover:text-offwhite hover:bg-navy-soft/40'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-gold/30 text-gold' : 'bg-offwhite-dim/20 text-offwhite-dim/70'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* ── TAB: 診断データ ── */}
        {activeTab === 'data' && (
          <>
            {/* グラフ */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <DailyBarChart title="新規登録（14日）" data={dailyRegs14} formatValue={(n) => `${n}件`} total={`${Object.values(dailyRegs14).reduce((a,b)=>a+b,0)}件 / 14日`} />
              <DailyBarChart title="PDFダウンロード（日次）" data={dailyDownloads} formatValue={(n) => `${n}人`} total={`${Object.values(dailyDownloads).reduce((a,b)=>a+b,0)}人 / 14日`} color="bg-blue-400" />
              <DailyBarChart title="API使用量（日次・$）" data={dailyApiCost} formatValue={(n) => `$${n.toFixed(3)}`} total={`$${Object.values(dailyApiCost).reduce((a,b)=>a+b,0).toFixed(3)} / 14日`} color="bg-emerald-400" />
            </section>

            {/* 関係性 */}
            {Object.keys(stats.relationBreakdown).length > 0 && (
              <section className="flex flex-wrap gap-2 px-4 py-2 rounded-xl border border-gold/15 bg-navy-soft/20">
                <span className="text-[11px] text-offwhite-dim/50 self-center mr-1">関係性</span>
                {Object.entries(stats.relationBreakdown).map(([tag, cnt]) => (
                  <span key={tag} className="text-[11px] text-offwhite-dim bg-navy-deep/40 border border-offwhite-dim/15 rounded px-2 py-0.5">
                    {toRelLabel(tag)} <span className="text-gold font-bold">{cnt}</span>
                  </span>
                ))}
              </section>
            )}

            {/* リスト＋詳細 */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`md:col-span-1 space-y-2 max-h-[80vh] overflow-y-auto pr-1 ${selected !== null ? 'hidden md:block' : 'block'}`}>
                {stats.rows.map((r, i) => (
                  <div key={r.id} className={`relative rounded-lg border ${r.hidden_at ? 'border-offwhite-dim/20 opacity-50' : selected === i ? 'border-gold bg-gold/10' : 'border-gold/20 bg-navy-soft/40'}`}>
                    <button onClick={() => setSelected(i)} className="w-full text-left p-3">
                      <p className="text-sm text-offwhite font-bold pr-8 flex items-center gap-2">
                        <span>{[r.last_name, r.first_name].filter(Boolean).join(' ') || r.clone_display_name || '(no-name)'}</span>
                        {r.hidden_at && <span className="text-[10px] text-offwhite-dim/50 font-normal">非表示</span>}
                        {(r.feedback_count ?? 0) > 0 && (
                          <span className="text-[10px] bg-gold/20 text-gold border border-gold/40 rounded px-1 font-bold">感想{r.feedback_count}</span>
                        )}
                      </p>
                      <p className="text-xs text-offwhite-dim">{r.email}</p>
                      <div className="flex flex-wrap gap-2 text-[10px] text-offwhite-dim/60 mt-1">
                        <span>状態:{toStatusLabel(r.status ?? '')}</span>
                        <span>DL:{r.download_count ?? 0}</span>
                        <span>Chat:{r.chat_count ?? 0}</span>
                        <span>${(r.api_cost_usd ?? 0).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gold/60 mt-1">{r.created_at?.slice(0,16).replace('T',' ')}</p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); void handleHide(r.id, !!r.hidden_at); }}
                      disabled={hidingId === r.id}
                      className="absolute top-2 right-2 text-[10px] text-offwhite-dim/50 hover:text-red-400 px-1.5 py-0.5 rounded border border-transparent hover:border-red-400/40"
                    >
                      {hidingId === r.id ? '…' : r.hidden_at ? '再表示' : '非表示'}
                    </button>
                  </div>
                ))}
              </div>

              <div className={`md:col-span-2 bg-navy-soft/40 border border-gold/20 rounded-xl p-5 space-y-4 max-h-[80vh] overflow-y-auto ${selected !== null ? 'block' : 'hidden md:block'}`}>
                {sel ? (
                  <>
                    <div className="border-b border-gold/20 pb-3 space-y-2">
                      <button className="md:hidden text-xs text-offwhite-dim border border-offwhite-dim/30 px-3 py-1 rounded-lg mb-2" onClick={() => setSelected(null)}>
                        ← 一覧に戻る
                      </button>
                      <div className="flex flex-wrap gap-2 items-baseline">
                        <h2 className="text-lg font-bold text-gold">{[sel.last_name, sel.first_name].filter(Boolean).join(' ') || sel.clone_display_name || '(no-name)'}</h2>
                        <span className="text-xs text-offwhite-dim">{sel.email}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sel.access_token && sel.status === 'completed' ? (
                          <a href={`/api/me/${sel.id}/pdf?token=${sel.access_token}`} target="_blank" rel="noopener noreferrer" className="text-xs border border-gold/40 text-gold px-3 py-1 rounded-lg hover:bg-gold/10">
                            PDFダウンロード
                          </a>
                        ) : (
                          <span className="text-xs text-offwhite-dim/40 border border-offwhite-dim/20 px-3 py-1 rounded-lg">PDF（未完了）</span>
                        )}
                        <a href={`/clone/${sel.id}`} target="_blank" rel="noopener noreferrer" className="text-xs border border-gold/40 text-gold px-3 py-1 rounded-lg hover:bg-gold/10">
                          分身AIを開く
                        </a>
                        <a href={`/me/${sel.id}`} target="_blank" rel="noopener noreferrer" className="text-xs border border-offwhite-dim/30 text-offwhite-dim px-3 py-1 rounded-lg hover:bg-offwhite-dim/10">
                          マイページ
                        </a>
                        {/* 個別メール送信 */}
                        {sel.email && (
                          <button
                            onClick={() => openMailForUser(sel.id)}
                            className="text-xs border border-blue-400/40 text-blue-300 px-3 py-1 rounded-lg hover:bg-blue-400/10"
                          >
                            メール送信
                          </button>
                        )}
                        <button
                          onClick={() => void handleHide(sel.id, !!sel.hidden_at)}
                          disabled={hidingId === sel.id}
                          className={`text-xs border px-3 py-1 rounded-lg ${sel.hidden_at ? 'border-amber-400/40 text-amber-400 hover:bg-amber-400/10' : 'border-red-400/40 text-red-400 hover:bg-red-400/10'}`}
                        >
                          {hidingId === sel.id ? '処理中…' : sel.hidden_at ? '再表示する' : '非表示にする'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <KV label="状態" value={toStatusLabel(sel.status ?? '')} />
                      <KV label="関係性" value={toRelLabel(sel.relationship_tag ?? '—')} />
                      <KV label="DL回数" value={(sel.download_count ?? 0).toString()} />
                      <KV label="Chat回数" value={(sel.chat_count ?? 0).toString()} />
                      <KV label="APIコスト" value={`$${(sel.api_cost_usd ?? 0).toFixed(3)}`} />
                      <KV label="登録" value={sel.created_at?.slice(0,16).replace('T',' ') ?? '—'} />
                      <KV label="完了" value={sel.completed_at?.slice(0,16).replace('T',' ') ?? '—'} />
                      <KV label="最終DL" value={sel.last_downloaded_at?.slice(0,16).replace('T',' ') ?? '—'} />
                    </div>

                    <details open className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
                      <summary className="cursor-pointer text-sm font-bold text-gold/80">選択回答（Q5〜Q30）</summary>
                      <div className="mt-3 space-y-2 text-xs">
                        {Object.entries(sel.select_answers ?? {}).map(([qid, choiceId]) => {
                          const q = qMap[qid];
                          const choice = q?.choices?.find((c) => c.id === choiceId);
                          return (
                            <div key={qid} className="bg-navy-deep/60 rounded p-2 border border-offwhite-dim/10">
                              <p className="text-gold/70 font-bold">{qid}: {q?.prompt ?? q?.title ?? '(質問定義なし)'}</p>
                              <p className="text-offwhite mt-1">→ <span className="text-gold">{choiceId}</span>. {choice?.text ?? '(選択肢定義なし)'}</p>
                            </div>
                          );
                        })}
                      </div>
                    </details>

                    <details className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
                      <summary className="cursor-pointer text-sm font-bold text-gold/80">本人の自由記述（Q31〜Q37）</summary>
                      <div className="mt-3 space-y-3 text-xs">
                        {Object.entries(sel.narrative_answers ?? {}).map(([qid, txt]) => {
                          const q = qMap[qid];
                          return (
                            <div key={qid}>
                              <p className="text-gold/70 font-bold">{qid}: {q?.prompt ?? q?.title ?? ''}</p>
                              <p className="text-offwhite-dim mt-1 whitespace-pre-wrap bg-navy-deep/60 p-2 rounded">{txt}</p>
                            </div>
                          );
                        })}
                      </div>
                    </details>

                    {(() => {
                      const selFeedbacks = feedbacks.filter(f => f.diagnosis_id === sel.id);
                      if (selFeedbacks.length === 0) return null;
                      return (
                        <details open className="bg-navy-deep/40 border border-gold/30 rounded-lg p-3">
                          <summary className="cursor-pointer text-sm font-bold text-gold">感想（{selFeedbacks.length}件）</summary>
                          <div className="mt-3 space-y-3">
                            {selFeedbacks.map(f => (
                              <div key={f.id} className="bg-navy-deep/60 rounded p-3 border border-offwhite-dim/10">
                                <p className="text-[10px] text-offwhite-dim/50 mb-1">{f.created_at?.slice(0,16).replace('T',' ')}</p>
                                <p className="text-sm text-offwhite whitespace-pre-wrap leading-relaxed">{f.message}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      );
                    })()}

                    {sel.style_sample && (
                      <details className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
                        <summary className="cursor-pointer text-sm font-bold text-gold/80">文体サンプル（Q38）</summary>
                        <p className="text-xs text-offwhite-dim mt-2 whitespace-pre-wrap bg-navy-deep/60 p-2 rounded">{sel.style_sample}</p>
                      </details>
                    )}

                    <details className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
                      <summary className="cursor-pointer text-sm font-bold text-gold/80">心理スコア</summary>
                      <pre className="text-[10px] text-offwhite-dim mt-2 bg-navy-deep/60 p-2 rounded overflow-x-auto max-h-72">{JSON.stringify(sel.scores, null, 2)}</pre>
                    </details>
                    <details className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
                      <summary className="cursor-pointer text-sm font-bold text-gold/80">命術16結果</summary>
                      <pre className="text-[10px] text-offwhite-dim mt-2 bg-navy-deep/60 p-2 rounded overflow-x-auto max-h-72">{JSON.stringify(sel.celestial_results, null, 2)}</pre>
                    </details>

                    {sel.report_text && Object.keys(sel.report_text).length > 0 && (
                      <details className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
                        <summary className="cursor-pointer text-sm font-bold text-gold/80">LLM生成レポート全文（章別）</summary>
                        <div className="mt-3 space-y-3 text-xs">
                          {Object.entries(sel.report_text).map(([k, v]) => (
                            <div key={k}>
                              <p className="text-gold font-bold mb-1">{k}（{v?.length ?? 0} 字）</p>
                              <p className="text-offwhite-dim whitespace-pre-wrap bg-navy-deep/60 p-2 rounded leading-relaxed">{v}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </>
                ) : (
                  <p className="text-offwhite-dim text-center py-12 text-sm">左のリストから選択してください</p>
                )}
              </div>
            </section>
          </>
        )}

        {/* ── TAB: 感想 ── */}
        {activeTab === 'feedbacks' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gold">感想一覧 <span className="text-offwhite-dim/60 font-normal ml-2">{feedbacks.length}件</span></h2>
              <button onClick={() => void loadFeedbacks()} className="text-xs border border-gold/40 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/10">再読み込み</button>
            </div>
            {feedbacks.length === 0 ? (
              <p className="text-offwhite-dim/50 text-sm text-center py-16">まだ感想はありません</p>
            ) : (
              <div className="space-y-3">
                {feedbacks.map(f => {
                  const diag = f.dna_diagnoses;
                  const name = [diag?.last_name, diag?.first_name].filter(Boolean).join(' ') || diag?.clone_display_name || '(no-name)';
                  return (
                    <div key={f.id} className="bg-navy-soft/40 border border-gold/15 rounded-xl px-5 py-4 hover:border-gold/30">
                      <div className="flex flex-wrap items-baseline gap-3 mb-2">
                        <span className="text-sm font-bold text-offwhite">{name}</span>
                        <span className="text-[11px] text-offwhite-dim/50">{diag?.email}</span>
                        <span className="text-[11px] text-offwhite-dim/40 ml-auto">{f.created_at?.slice(0,16).replace('T',' ')}</span>
                      </div>
                      <p className="text-sm text-offwhite-dim leading-relaxed whitespace-pre-wrap">{f.message}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            const row = stats?.rows.find(r => r.id === f.diagnosis_id);
                            if (row) {
                              const idx = stats!.rows.indexOf(row);
                              setSelected(idx);
                              setActiveTab('data');
                            }
                          }}
                          className="text-[11px] text-gold/60 hover:text-gold"
                        >
                          診断データを見る →
                        </button>
                        {diag?.email && (
                          <button
                            onClick={() => openMailForUser(f.diagnosis_id)}
                            className="text-[11px] text-blue-300/60 hover:text-blue-300"
                          >
                            メール送信 →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── TAB: メール配信 ── */}
        {activeTab === 'mail' && (
          <section className="max-w-2xl space-y-5">
            <h2 className="text-sm font-bold text-gold">メール配信</h2>

            {/* 宛先 */}
            <div className="bg-navy-soft/40 border border-gold/20 rounded-xl p-5 space-y-4">
              <div>
                <label className="text-xs text-offwhite-dim/70 uppercase tracking-wider mb-2 block">宛先</label>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { value: 'completed', label: `完了者のみ（${completedRows.length}名）` },
                    { value: 'all', label: `全員（${stats.rows.filter(r=>r.email).length}名）` },
                    { value: 'selected', label: mail.selectedIds.length > 0 ? `選択中（${mail.selectedIds.length}名）` : '個別選択' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setMail(m => ({ ...m, toType: opt.value }))}
                      className={`px-4 py-2 rounded-lg text-sm border ${mail.toType === opt.value ? 'border-gold bg-gold/15 text-gold' : 'border-offwhite-dim/30 text-offwhite-dim hover:border-gold/50'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {mail.toType === 'selected' && (
                  <div className="mt-3">
                    <p className="text-xs text-offwhite-dim/60 mb-2">診断データタブで対象者を選び「メール送信」ボタンを押すか、IDを直接入力</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {stats.rows.filter(r => r.email).map(r => {
                        const isSelected = mail.selectedIds.includes(r.id);
                        const name = [r.last_name, r.first_name].filter(Boolean).join(' ') || r.email || r.id;
                        return (
                          <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-navy-soft/40 px-2 py-1 rounded">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => setMail(m => ({
                                ...m,
                                selectedIds: isSelected
                                  ? m.selectedIds.filter(id => id !== r.id)
                                  : [...m.selectedIds, r.id],
                              }))}
                              className="accent-gold"
                            />
                            <span className="text-offwhite">{name}</span>
                            <span className="text-offwhite-dim/50 ml-1">{r.email}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 件名 */}
              <div>
                <label className="text-xs text-offwhite-dim/70 uppercase tracking-wider mb-1.5 block">件名</label>
                <input
                  type="text"
                  value={mail.subject}
                  onChange={e => setMail(m => ({ ...m, subject: e.target.value }))}
                  placeholder="例：【DNA診断AI】重要なお知らせ"
                  className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-2.5 text-offwhite text-sm focus:border-gold outline-none"
                />
              </div>

              {/* 本文 */}
              <div>
                <label className="text-xs text-offwhite-dim/70 uppercase tracking-wider mb-1.5 block">
                  本文
                  <span className="text-offwhite-dim/40 font-normal ml-2 normal-case">プレースホルダー: {`{{name}}`} {`{{firstName}}`} {`{{myPageUrl}}`}</span>
                </label>
                <textarea
                  value={mail.body}
                  onChange={e => setMail(m => ({ ...m, body: e.target.value }))}
                  rows={12}
                  placeholder={`{{name}}\n\nいつもDNA診断AIをご利用いただきありがとうございます。\n\nマイページはこちらからアクセスできます：\n{{myPageUrl}}\n\n— DNA診断AI`}
                  className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-offwhite text-sm focus:border-gold outline-none resize-y font-mono leading-relaxed"
                />
              </div>

              {/* エラー・結果 */}
              {mail.error && <p className="text-red-300 text-sm">{mail.error}</p>}
              {mail.result && (
                <div className={`rounded-lg p-4 text-sm ${mail.result.failed > 0 ? 'bg-amber-900/20 border border-amber-400/30' : 'bg-emerald-900/20 border border-emerald-400/30'}`}>
                  <p className={`font-bold ${mail.result.failed > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                    送信完了: {mail.result.sent}件成功 / {mail.result.failed}件失敗 / 合計{mail.result.total}件
                  </p>
                </div>
              )}

              {/* 送信ボタン */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => void sendMail()}
                  disabled={mail.sending || !mail.subject.trim() || !mail.body.trim() || mailTargetCount === 0}
                  className="px-6 py-2.5 bg-gold text-navy-deep font-bold rounded-lg hover:bg-gold-light disabled:opacity-40 text-sm"
                >
                  {mail.sending ? `送信中…` : `${mailTargetCount}名に送信`}
                </button>
                <button
                  onClick={() => setMail(m => ({ ...m, subject: '', body: '', result: null, error: '' }))}
                  className="px-4 py-2.5 border border-offwhite-dim/30 text-offwhite-dim rounded-lg text-sm hover:border-gold/40"
                >
                  クリア
                </button>
              </div>
            </div>

            {/* 過去テンプレート */}
            <div className="bg-navy-soft/40 border border-gold/15 rounded-xl p-5 space-y-3">
              <h3 className="text-xs text-gold/70 uppercase tracking-wider">クイックテンプレート</h3>
              <div className="space-y-2">
                {[
                  {
                    label: 'レポート完成通知',
                    subject: '【DNA診断AI】あなたのレポートが完成しました',
                    body: `{{name}}\n\nお待たせしました。\nあなたのDNA診断レポートが完成しました。\n\n▼ マイページ（PDF・分身AIボット）\n{{myPageUrl}}\n\n— DNA診断AI`,
                  },
                  {
                    label: 'フォローアップ',
                    subject: '【DNA診断AI】レポートはご覧いただけましたか？',
                    body: `{{name}}\n\nDNA診断AIをご利用いただきありがとうございます。\n\nレポートや分身AIボットはご活用いただいていますか？\nご感想やご質問があれば、このメールにご返信ください。\n\n▼ マイページ\n{{myPageUrl}}\n\n— DNA診断AI`,
                  },
                ].map(t => (
                  <button
                    key={t.label}
                    onClick={() => setMail(m => ({ ...m, subject: t.subject, body: t.body, result: null, error: '' }))}
                    className="w-full text-left px-4 py-2.5 border border-gold/15 rounded-lg text-sm text-offwhite-dim hover:border-gold/40 hover:text-offwhite"
                  >
                    <span className="text-gold/70 font-medium">{t.label}</span>
                    <span className="text-offwhite-dim/40 ml-2 text-xs">{t.subject}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── TAB: 受信ボックス ── */}
        {activeTab === 'inbox' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gold">受信ボックス（dna@kami-ai.jp）</h2>
              <button
                onClick={() => void loadInbox()}
                disabled={inboxLoading}
                className="border border-gold/40 text-gold px-3 py-1.5 rounded-lg text-sm hover:bg-gold/10 disabled:opacity-50"
              >
                {inboxLoading ? '読み込み中…' : '受信メールを読み込む'}
              </button>
            </div>

            {/* 初回案内 */}
            {inboxMessages.length === 0 && !inboxLoading && !inboxError && (
              <div className="bg-amber-900/15 border border-amber-500/30 rounded-xl p-5 space-y-3 text-sm">
                <p className="text-amber-300 font-bold">受信ボックスを使うための初期設定が必要です</p>
                <ol className="text-offwhite-dim space-y-2 list-decimal list-inside">
                  <li>
                    <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-gold underline">Cloudflareダッシュボード</a>
                    を開く
                  </li>
                  <li>kami-ai.jp → Email → Email Routing を開く</li>
                  <li>「Routing rules」→「Add address」→ From: <code className="bg-navy-deep/60 px-1 rounded">dna@kami-ai.jp</code> / Action: Send to → <code className="bg-navy-deep/60 px-1 rounded">yoisno@gmail.com</code></li>
                  <li>設定後、上の「受信メールを読み込む」ボタンを押す</li>
                </ol>
                <p className="text-offwhite-dim/50 text-xs">
                  ※ 転送先のyoisno@gmail.com受信トレイを表示します。dna@kami-ai.jpへの返信メールがここに届きます。
                </p>
              </div>
            )}

            {inboxError && (
              <div className="bg-red-900/20 border border-red-400/30 rounded-xl p-4 text-sm text-red-300">
                {inboxError}
              </div>
            )}

            {inboxMessages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* メール一覧 */}
                <div className="md:col-span-2 space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
                  {inboxMessages.map(msg => (
                    <button
                      key={msg.uid}
                      onClick={() => openInboxMessage(msg)}
                      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                        selectedInbox?.uid === msg.uid
                          ? 'border-gold bg-gold/10'
                          : msg.read
                          ? 'border-offwhite-dim/15 bg-navy-soft/30 hover:border-gold/30'
                          : 'border-blue-400/40 bg-blue-900/10 hover:border-gold/40'
                      }`}
                    >
                      <p className={`text-xs font-medium truncate ${msg.read ? 'text-offwhite-dim' : 'text-offwhite font-bold'}`}>
                        {msg.fromName || msg.from}
                      </p>
                      <p className={`text-xs truncate mt-0.5 ${msg.read ? 'text-offwhite-dim/60' : 'text-offwhite/80'}`}>
                        {msg.subject}
                      </p>
                      <p className="text-[10px] text-offwhite-dim/40 mt-1">
                        {new Date(msg.date).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </button>
                  ))}
                </div>

                {/* メール本文 + 返信 */}
                <div className="md:col-span-3 bg-navy-soft/40 border border-gold/20 rounded-xl p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  {selectedInbox ? (
                    <>
                      <div className="space-y-2 border-b border-gold/20 pb-3">
                        <h3 className="text-sm font-bold text-offwhite">{selectedInbox.subject}</h3>
                        <p className="text-xs text-offwhite-dim">
                          差出人: <span className="text-gold">{selectedInbox.fromName}</span> &lt;{selectedInbox.from}&gt;
                        </p>
                        <p className="text-xs text-offwhite-dim/50">
                          受信: {new Date(selectedInbox.date).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                        </p>
                      </div>

                      {/* 本文 */}
                      <div className="text-sm text-offwhite-dim whitespace-pre-wrap leading-relaxed bg-navy-deep/30 rounded-lg p-4 max-h-64 overflow-y-auto">
                        {selectedInbox.bodyText || '(本文なし)'}
                      </div>

                      {/* 返信フォーム */}
                      <div className="space-y-3 border-t border-gold/15 pt-4">
                        <p className="text-xs text-gold/70 uppercase tracking-wider">返信</p>
                        <div className="space-y-2">
                          <input
                            type="email"
                            value={reply.to}
                            onChange={e => setReply(r => ({ ...r, to: e.target.value }))}
                            placeholder="宛先"
                            className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-3 py-2 text-offwhite text-sm focus:border-gold outline-none"
                          />
                          <input
                            type="text"
                            value={reply.subject}
                            onChange={e => setReply(r => ({ ...r, subject: e.target.value }))}
                            placeholder="件名"
                            className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-3 py-2 text-offwhite text-sm focus:border-gold outline-none"
                          />
                          <textarea
                            value={reply.body}
                            onChange={e => setReply(r => ({ ...r, body: e.target.value, sent: false }))}
                            rows={6}
                            placeholder="返信内容を入力…"
                            className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-3 py-2 text-offwhite text-sm focus:border-gold outline-none resize-y leading-relaxed"
                          />
                        </div>
                        {reply.error && <p className="text-red-300 text-xs">{reply.error}</p>}
                        {reply.sent && <p className="text-emerald-300 text-xs">送信しました</p>}
                        <button
                          onClick={() => void sendReply()}
                          disabled={reply.sending || !reply.body.trim()}
                          className="px-5 py-2 bg-gold text-navy-deep font-bold rounded-lg text-sm hover:bg-gold-light disabled:opacity-40"
                        >
                          {reply.sending ? '送信中…' : '返信を送信'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-offwhite-dim/50 text-sm text-center py-12">左からメールを選択してください</p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── TAB: ページ管理 ── */}
        {activeTab === 'pages' && (
          <section className="max-w-2xl space-y-4">
            <h2 className="text-sm font-bold text-gold">ページ管理</h2>
            <div className="bg-navy-soft/40 border border-gold/20 rounded-xl p-8 text-center space-y-3">
              <p className="text-offwhite-dim">診断フォームの質問文・選択肢を編集できる機能は次フェーズで実装します。</p>
              <p className="text-offwhite-dim/50 text-sm">現在の質問定義: {questions.length}件読み込み済み</p>
              <div className="text-left mt-4 space-y-2 max-h-96 overflow-y-auto">
                {questions.slice(0, 10).map(q => (
                  <div key={q.id} className="bg-navy-deep/40 rounded p-3 border border-offwhite-dim/10">
                    <p className="text-xs text-gold/70 font-bold">{q.id}</p>
                    <p className="text-sm text-offwhite mt-0.5">{q.prompt ?? q.title ?? '(定義なし)'}</p>
                    {q.choices && <p className="text-[10px] text-offwhite-dim/50 mt-1">選択肢 {q.choices.length}件</p>}
                  </div>
                ))}
                {questions.length > 10 && <p className="text-xs text-offwhite-dim/40 text-center">…他 {questions.length - 10}件</p>}
              </div>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}

function DailyBarChart({ title, data, formatValue, total, color = 'bg-gold' }: {
  title: string; data: Record<string, number>; formatValue: (n: number) => string; total: string; color?: string;
}) {
  const entries = Object.entries(data).reverse();
  const max = Math.max(...entries.map(([, n]) => n));
  const hasData = max > 0;
  const todayKey = new Date().toISOString().slice(0, 10);
  return (
    <div className="bg-navy-soft/40 border border-gold/20 rounded-2xl p-4">
      <h2 className="text-sm font-bold text-gold mb-1">{title}</h2>
      {!hasData && <p className="text-[10px] text-offwhite-dim/40 mb-2">データ収集中</p>}
      <div className="flex items-end gap-[2px] h-24">
        {entries.map(([d, n]) => {
          const isToday = d === todayKey;
          const h = hasData && n > 0 ? Math.max(10, (n / max) * 100) : 1;
          return (
            <div key={d} className="flex-1 h-full flex flex-col items-center justify-end relative group" title={`${d.slice(5)}: ${formatValue(n)}`}>
              {n > 0 && (
                <span className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-navy-deep border border-gold/30 text-gold text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                  {d.slice(5)} {formatValue(n)}
                </span>
              )}
              <div className={`w-full rounded-sm ${n > 0 ? color : 'bg-offwhite-dim/5'} ${isToday && n > 0 ? 'ring-1 ring-white/50' : ''}`} style={{ height: `${h}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="text-[10px] text-offwhite-dim/60">{total}</p>
        {hasData && <p className="text-[10px] text-offwhite-dim/40">最大 {formatValue(max)}</p>}
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-deep/40 rounded p-2">
      <p className="text-[10px] text-offwhite-dim/60">{label}</p>
      <p className="text-offwhite font-bold truncate">{value}</p>
    </div>
  );
}

function MiniKPI({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <span className="text-sm">
      <span className="text-offwhite-dim/60 mr-1">{label}</span>
      <span className={`font-bold ${warn ? 'text-red-300' : accent ? 'text-gold' : 'text-offwhite'}`}>{value}</span>
    </span>
  );
}
