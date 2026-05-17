'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { stripMarkdownToPlain } from '@/lib/text/strip-markdown';

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

// 日時を JST (Asia/Tokyo) で「YYYY-MM-DD HH:MM」に整形
// DB は timestamptz で UTC 保存 → そのまま表示すると 9時間ズレるため必ずこの関数を通す
function toJST(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const j = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return j.toISOString().slice(0, 16).replace('T', ' ');
}

type TabId = 'data' | 'feedbacks' | 'mail' | 'pages';

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
  email_report_sent_at?: string | null;
  duplicate_count?: number;
}

interface ResendPreview {
  id: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  myPageUrl: string;
  wasAlreadySent: boolean;
  lastSentAt: string | null;
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

// マイページ全員共通レイアウト編集
type LayoutSectionKey = 'report' | 'clone' | 'share' | 'referral' | 'feedback' | 'match' | 'edit-narrative';
interface LayoutSection {
  key: LayoutSectionKey;
  visible: boolean;
  title: string;
  fields: Record<string, string>;
}
interface MypageLayout {
  header: { label: string; subtitle: string };
  intro: { visible: boolean; title: string; body: string };
  announcement: { visible: boolean; title: string; body: string; linkUrl: string; linkText: string };
  sections: LayoutSection[];
  footer: { note: string };
}

// 各セクションの編集可能フィールド定義（admin UI で出す textarea/input 一覧）
interface SectionFieldSpec {
  key: string;
  label: string;
  multiline?: boolean;
  hint?: string;
}
const SECTION_FIELD_SPECS: Record<LayoutSectionKey, SectionFieldSpec[]> = {
  report: [
    { key: 'ctaLabel',       label: 'PDFダウンロードボタン文言' },
    { key: 'description',    label: '説明文（PDFの下に小さく表示）', multiline: true },
    { key: 'pendingMessage', label: '生成中メッセージ（未完成時のみ表示）', multiline: true },
  ],
  clone: [
    { key: 'diffHeading',      label: '差別化見出し（空欄で非表示）' },
    { key: 'diffBody',         label: '差別化本文（ChatGPT との違い等）', multiline: true },
    { key: 'howToHeading',     label: '使い方セクション見出し' },
    { key: 'step1Title',       label: 'STEP1 タイトル' },
    { key: 'step1Body',        label: 'STEP1 本文', multiline: true },
    { key: 'step2Title',       label: 'STEP2 タイトル' },
    { key: 'step2Body',        label: 'STEP2 本文', multiline: true },
    { key: 'step3Title',       label: 'STEP3 タイトル' },
    { key: 'step3Body',        label: 'STEP3 本文', multiline: true },
    { key: 'ctaLabel',         label: 'CTAボタン文言' },
    { key: 'displayNameLabel', label: '表示名フィールドのラベル' },
    { key: 'savedMessage',     label: '表示名保存後のメッセージ' },
    { key: 'lockedMessage',    label: 'レポート未完成時の文言' },
  ],
  share: [
    { key: 'body1',         label: '本文1段落目', multiline: true },
    { key: 'body2',         label: '本文2段落目', multiline: true },
    { key: 'body3',         label: '本文3段落目', multiline: true },
    { key: 'securityNote',  label: '注意書き（小さい文字）', multiline: true },
    { key: 'shareLeadText', label: 'シェアボタン直前の文言' },
    { key: 'shareMessage',  label: 'シェア本文テンプレ', multiline: true, hint: '{name} は公開表示名に自動置換される' },
  ],
  referral: [
    { key: 'body',         label: '本文', multiline: true },
    { key: 'shareMessage', label: 'シェア本文テンプレ', multiline: true },
  ],
  feedback: [
    { key: 'placeholder',     label: '入力プレースホルダ', multiline: true },
    { key: 'submitLabel',     label: '送信ボタン文言' },
    { key: 'sentThanks',      label: '送信後のお礼メッセージ', multiline: true },
    { key: 'giftPrefix',      label: '特典導入文' },
    { key: 'giftHighlight',   label: '特典タイトル（強調）' },
    { key: 'giftSuffix',      label: '特典締めくくり文' },
    { key: 'giftButtonLabel', label: '特典CTAボタン文言' },
    { key: 'giftUrl',         label: '特典リンクURL', hint: 'http:// または https:// 必須' },
    { key: 'giftPostText',    label: '特典後の補足文', multiline: true },
    { key: 'replyAgainLabel', label: '再投稿ボタン文言' },
  ],
  match: [],
  'edit-narrative': [],
};
interface LayoutEditState {
  loading: boolean;
  saving: boolean;
  error: string;
  savedAt: string | null;
  draft: MypageLayout | null;
  original: MypageLayout | null;
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
  const [resendPreview, setResendPreview] = useState<ResendPreview | null>(null);
  const [resendPreviewLoading, setResendPreviewLoading] = useState<string | null>(null);
  const [resendPreviewError, setResendPreviewError] = useState<string>('');
  const [resendSending, setResendSending] = useState(false);
  const [resendResultMsg, setResendResultMsg] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('text');
  // 編集された本文。openResendPreview 時に API から取得した text を初期値にする
  const [editedText, setEditedText] = useState<string>('');
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('data');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [layoutEdit, setLayoutEdit] = useState<LayoutEditState>({
    loading: false, saving: false, error: '', savedAt: null, draft: null, original: null,
  });
  const [sendLogs, setSendLogs] = useState<Array<{
    id: string; created_at: string; subject: string; to_type: string;
    sent: number; failed: number; total: number; body_preview: string;
  }>>([]);
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
    void loadSendLogs();
    // setInterval では silent=true → 全画面スピナーを出さない
    const timer = setInterval(() => { void loadStats(undefined, true); void loadFeedbacks(); }, 60_000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const loadStats = async (forceShowHidden?: boolean, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const sh = forceShowHidden ?? showHidden;
      const r = await fetch(`/api/admin/stats?pass=${encodeURIComponent(pass)}${sh ? '&show_hidden=1' : ''}`);
      if (r.ok) setStats(await r.json());
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadSendLogs = async () => {
    try {
      const r = await fetch(`/api/admin/send-log?pass=${encodeURIComponent(pass)}&limit=30`);
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d.logs)) setSendLogs(d.logs);
      }
    } catch {}
  };

  // レポート再送：プレビュー取得（送信はしない）
  const openResendPreview = async (id: string) => {
    setResendPreviewLoading(id);
    setResendPreviewError('');
    setResendResultMsg('');
    try {
      const r = await fetch('/api/admin/resend-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pass}` },
        body: JSON.stringify({ id, previewOnly: true }),
      });
      const j = await r.json();
      if (j.ok) {
        setResendPreview({
          id,
          to: j.to,
          subject: j.subject,
          text: j.text,
          html: j.html,
          myPageUrl: j.myPageUrl,
          wasAlreadySent: j.wasAlreadySent,
          lastSentAt: j.lastSentAt,
        });
        setEditedText(j.text);
        setPreviewMode('text');
      } else {
        setResendPreviewError(`プレビュー取得失敗: ${j.error ?? 'unknown'}`);
      }
    } catch (e) {
      setResendPreviewError(`通信エラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setResendPreviewLoading(null);
    }
  };

  // レポート再送：実際に送信（プレビューモーダルから呼ぶ）
  const handleResendConfirm = async () => {
    if (!resendPreview) return;
    setResendSending(true);
    setResendResultMsg('');
    try {
      const r = await fetch('/api/admin/resend-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pass}` },
        body: JSON.stringify({ id: resendPreview.id, customText: editedText }),
      });
      const j: { ok: boolean; error?: string; sentAt?: string; cooldownRemainingSec?: number } = await r.json();
      if (j.ok) {
        setResendResultMsg(`✓ ${resendPreview.to} に送信完了（${toJST(j.sentAt)} JST）`);
        setResendPreview(null);
        await loadStats();
      } else if (j.cooldownRemainingSec !== undefined) {
        setResendResultMsg(`✗ クールダウン中（あと${j.cooldownRemainingSec}秒。同一IDへの連続送信防止）`);
      } else {
        setResendResultMsg(`✗ 送信失敗: ${j.error ?? 'unknown'}`);
      }
    } catch (e) {
      setResendResultMsg(`✗ 通信エラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setResendSending(false);
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

  // ── ページ管理：マイページ全員共通レイアウト編集 ──
  const loadMypageLayout = async () => {
    setLayoutEdit(s => ({ ...s, loading: true, error: '', savedAt: null }));
    try {
      const r = await fetch(`/api/admin/mypage-layout?pass=${encodeURIComponent(pass)}`);
      const d = await r.json();
      if (!d.ok) {
        setLayoutEdit(s => ({ ...s, loading: false, error: d.error ?? '取得失敗' }));
        return;
      }
      const lo = d.layout as MypageLayout;
      setLayoutEdit({ loading: false, saving: false, error: '', savedAt: null, draft: lo, original: lo });
    } catch (e) {
      setLayoutEdit(s => ({ ...s, loading: false, error: String(e) }));
    }
  };

  const updateLayout = (mutator: (l: MypageLayout) => MypageLayout) => {
    setLayoutEdit(s => s.draft ? { ...s, draft: mutator(s.draft), savedAt: null } : s);
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    updateLayout(l => {
      const n = idx + dir;
      if (n < 0 || n >= l.sections.length) return l;
      const sections = [...l.sections];
      [sections[idx], sections[n]] = [sections[n], sections[idx]];
      return { ...l, sections };
    });
  };

  const updateSectionField = (idx: number, fk: string, fv: string) => {
    updateLayout(l => ({
      ...l,
      sections: l.sections.map((s, i) => i === idx ? { ...s, fields: { ...s.fields, [fk]: fv } } : s),
    }));
  };

  const resetLayoutDraft = () => {
    setLayoutEdit(s => s.original ? { ...s, draft: s.original, savedAt: null, error: '' } : s);
  };

  const saveMypageLayout = async () => {
    if (!layoutEdit.draft) return;
    setLayoutEdit(s => ({ ...s, saving: true, error: '' }));
    try {
      const res = await fetch('/api/admin/mypage-layout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pass, layout: layoutEdit.draft }),
      });
      const d = await res.json();
      if (!d.ok) {
        setLayoutEdit(s => ({ ...s, saving: false, error: d.error ?? '保存失敗' }));
        return;
      }
      const lo = d.layout as MypageLayout;
      setLayoutEdit({ loading: false, saving: false, error: '', savedAt: new Date().toISOString(), draft: lo, original: lo });
    } catch (e) {
      setLayoutEdit(s => ({ ...s, saving: false, error: String(e) }));
    }
  };

  // タブ切り替え時の副作用
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'pages' && !layoutEdit.draft && !layoutEdit.loading) {
      void loadMypageLayout();
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
    // 一括送信は必ず確認ダイアログを挟む
    if (mail.toType !== 'selected') {
      const label = mail.toType === 'completed' ? '完了者全員' : '全ユーザー';
      if (!window.confirm(`【送信確認】\n${label}（${mailTargetCount}名）にメールを送信します。\n\n件名: ${mail.subject}\n\nよろしいですか？`)) return;
    }
    setMail(m => ({ ...m, sending: true, error: '', result: null }));
    try {
      const to = mail.toType === 'selected' ? mail.selectedIds : mail.toType;
      const r = await fetch('/api/admin/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pass,
          to,
          subject: mail.subject,
          body: mail.body,
          confirm: true,
          // Gate 2: DBの実件数と照合するため、UI側が把握している件数を明示送信
          ...(typeof to === 'string' ? { targetCount: mailTargetCount } : {}),
        }),
      });
      const d = await r.json();
      if (d.ok) {
        setMail(m => ({ ...m, result: { sent: d.sent, failed: d.failed, total: d.total }, sending: false }));
        // 送信後にログを更新
        void loadSendLogs();
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

  // 初回ロード（stats未取得）のみ全画面スピナー
  // 以降の定期更新は silent=true でここに到達しない
  if (!stats) {
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

  const TABS: { id: TabId; label: string; badge?: number }[] = [
    { id: 'data', label: '診断データ', badge: stats.rows.length },
    { id: 'feedbacks', label: '感想', badge: feedbacks.length },
    { id: 'mail', label: 'メール配信' },
    { id: 'pages', label: 'ページ管理' },
  ];

  return (
    <main className="min-h-screen bg-navy-deep text-offwhite px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* レポート再送プレビューモーダル */}
        {resendPreview && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
            onClick={() => !resendSending && setResendPreview(null)}
          >
            <div
              className="bg-navy-deep border border-gold/40 rounded-xl max-w-2xl w-full my-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div className="p-5 border-b border-gold/20">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-lg font-bold text-gold">レポート完了メール プレビュー</h2>
                  <button
                    onClick={() => !resendSending && setResendPreview(null)}
                    className="text-offwhite-dim hover:text-offwhite text-xl leading-none px-2"
                    aria-label="閉じる"
                  >×</button>
                </div>
                <div className="text-xs text-offwhite-dim space-y-1">
                  <div><span className="text-offwhite-dim/60">宛先：</span><span className="text-offwhite font-mono">{resendPreview.to}</span></div>
                  <div><span className="text-offwhite-dim/60">件名：</span>{resendPreview.subject}</div>
                  <div>
                    <span className="text-offwhite-dim/60">過去送信：</span>
                    {resendPreview.wasAlreadySent ? (
                      <span className="text-emerald-300">{toJST(resendPreview.lastSentAt)} JST（再送になります）</span>
                    ) : (
                      <span className="text-red-300">未送信（新規送信）</span>
                    )}
                  </div>
                </div>
              </div>

              {/* プレビュー切替 */}
              <div className="flex border-b border-gold/20 text-xs">
                <button
                  onClick={() => setPreviewMode('html')}
                  className={`flex-1 px-4 py-2 ${previewMode === 'html' ? 'bg-gold/10 text-gold border-b-2 border-gold' : 'text-offwhite-dim hover:bg-offwhite-dim/5'}`}
                >HTML プレビュー</button>
                <button
                  onClick={() => setPreviewMode('text')}
                  className={`flex-1 px-4 py-2 ${previewMode === 'text' ? 'bg-gold/10 text-gold border-b-2 border-gold' : 'text-offwhite-dim hover:bg-offwhite-dim/5'}`}
                >テキスト版</button>
              </div>

              {/* プレビュー本体 */}
              <div className="p-5 max-h-[55vh] overflow-y-auto bg-offwhite/5">
                {previewMode === 'html' ? (
                  <>
                    <p className="text-[10px] text-offwhite-dim/60 mb-2">
                      ※ HTMLプレビューは現在のテキスト編集内容を装飾フレーム内に流し込んだもの。「マイページを開く」ボタンと「マイページでできること」ブロックは常時表示される固定要素。
                    </p>
                    <iframe
                      srcDoc={renderHtmlFromText(editedText, resendPreview.myPageUrl)}
                      title="メールHTMLプレビュー"
                      sandbox=""
                      className="w-full bg-white rounded border border-offwhite-dim/20"
                      style={{ minHeight: '420px' }}
                    />
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <p className="text-[10px] text-offwhite-dim/60">
                        ✏ 編集可能。送信時はこの内容が使われる（マイページURLは下の固定リンク・「マイページを開く」ボタンは HTML 側に常時表示）
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditedText(resendPreview.text)}
                        className="text-[10px] border border-offwhite-dim/30 text-offwhite-dim px-2 py-0.5 rounded hover:bg-offwhite-dim/10"
                        title="編集内容をデフォルトテンプレに戻す"
                      >リセット</button>
                    </div>
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full text-xs text-offwhite whitespace-pre-wrap font-mono leading-relaxed bg-navy-deep/60 border border-offwhite-dim/20 rounded p-3"
                      style={{ minHeight: '320px' }}
                      spellCheck={false}
                    />
                    <p className="text-[10px] text-offwhite-dim/50 mt-1 text-right">
                      {editedText.length} / 5000 文字
                    </p>
                  </>
                )}
              </div>

              {/* マイページURL */}
              <div className="px-5 py-3 border-t border-gold/20 text-[11px] text-offwhite-dim/80 break-all">
                <span className="text-offwhite-dim/60">マイページURL：</span>
                <a href={resendPreview.myPageUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                  {resendPreview.myPageUrl}
                </a>
              </div>

              {/* アクションフッタ */}
              <div className="p-5 border-t border-gold/20 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[11px] text-offwhite-dim/60">
                  ※ この内容で <strong className="text-offwhite-dim">{resendPreview.to}</strong> 宛に送信します
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => !resendSending && setResendPreview(null)}
                    disabled={resendSending}
                    className="text-xs border border-offwhite-dim/30 text-offwhite-dim px-4 py-2 rounded-lg hover:bg-offwhite-dim/10 disabled:opacity-50"
                  >キャンセル</button>
                  <button
                    onClick={() => void handleResendConfirm()}
                    disabled={resendSending}
                    className="text-xs border border-emerald-400/60 bg-emerald-500/20 text-emerald-200 font-bold px-5 py-2 rounded-lg hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    {resendSending ? '送信中…' : 'この内容で送信する'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
              onClick={() => handleTabChange(tab.id)}
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
                      <p className="text-sm text-offwhite font-bold pr-8 flex items-center gap-2 flex-wrap">
                        <span>{[r.last_name, r.first_name].filter(Boolean).join(' ') || r.clone_display_name || '(no-name)'}</span>
                        {r.hidden_at && <span className="text-[10px] text-offwhite-dim/50 font-normal">非表示</span>}
                        {(r.feedback_count ?? 0) > 0 && (
                          <span className="text-[10px] bg-gold/20 text-gold border border-gold/40 rounded px-1 font-bold">感想{r.feedback_count}</span>
                        )}
                        {(r.duplicate_count ?? 1) > 1 && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/40 rounded px-1 font-bold" title="同じメールアドレスで複数の診断申込あり">
                            重複{r.duplicate_count}
                          </span>
                        )}
                        {r.status === 'completed' && (
                          r.email_report_sent_at ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded px-1 font-bold" title={`完了報告メール送信済: ${toJST(r.email_report_sent_at)} JST`}>
                              ✉ 送信済
                            </span>
                          ) : (
                            <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-400/40 rounded px-1 font-bold" title="完了報告メール未送信">
                              ✉ 未送信
                            </span>
                          )
                        )}
                      </p>
                      <p className="text-xs text-offwhite-dim">{r.email}</p>
                      <div className="flex flex-wrap gap-2 text-[10px] text-offwhite-dim/60 mt-1">
                        <span>状態:{toStatusLabel(r.status ?? '')}</span>
                        <span>DL:{r.download_count ?? 0}</span>
                        <span>Chat:{r.chat_count ?? 0}</span>
                        <span>${(r.api_cost_usd ?? 0).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gold/60 mt-1">{toJST(r.created_at)} JST</p>
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
                        {/* 個別メール送信（自由文） */}
                        {sel.email && (
                          <button
                            onClick={() => openMailForUser(sel.id)}
                            className="text-xs border border-blue-400/40 text-blue-300 px-3 py-1 rounded-lg hover:bg-blue-400/10"
                          >
                            メール送信
                          </button>
                        )}
                        {/* レポート完了メール プレビュー → 確認後に送信 */}
                        {sel.email && sel.status === 'completed' && sel.access_token && (
                          <button
                            onClick={() => void openResendPreview(sel.id)}
                            disabled={resendPreviewLoading === sel.id}
                            className={`text-xs border px-3 py-1 rounded-lg ${
                              sel.email_report_sent_at
                                ? 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10'
                                : 'border-red-400/60 text-red-300 hover:bg-red-400/10'
                            }`}
                            title={sel.email_report_sent_at
                              ? `送信済（${toJST(sel.email_report_sent_at)} JST）。クリックでプレビュー→再送`
                              : '未送信。クリックでプレビュー→送信'}
                          >
                            {resendPreviewLoading === sel.id
                              ? 'プレビュー取得中…'
                              : sel.email_report_sent_at ? '✉ レポート再送（プレビュー）' : '✉ レポート送信（プレビュー）'}
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
                      {resendPreviewError && (
                        <p className="text-xs mt-2 text-red-300">{resendPreviewError}</p>
                      )}
                      {resendResultMsg && (
                        <p className={`text-xs mt-2 ${resendResultMsg.startsWith('✓') ? 'text-emerald-300' : 'text-red-300'}`}>
                          {resendResultMsg}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <KV label="状態" value={toStatusLabel(sel.status ?? '')} />
                      <KV label="関係性" value={toRelLabel(sel.relationship_tag ?? '—')} />
                      <KV label="DL回数" value={(sel.download_count ?? 0).toString()} />
                      <KV label="Chat回数" value={(sel.chat_count ?? 0).toString()} />
                      <KV label="APIコスト" value={`$${(sel.api_cost_usd ?? 0).toFixed(3)}`} />
                      <KV label="登録 (JST)" value={toJST(sel.created_at)} />
                      <KV label="完了 (JST)" value={toJST(sel.completed_at)} />
                      <KV label="メール送信 (JST)" value={sel.email_report_sent_at ? toJST(sel.email_report_sent_at) : (sel.status === 'completed' ? '未送信' : '—')} />
                      <KV label="最終DL (JST)" value={toJST(sel.last_downloaded_at)} />
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
                                <p className="text-[10px] text-offwhite-dim/50 mb-1">{toJST(f.created_at)} JST</p>
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
                              <p className="text-offwhite-dim whitespace-pre-wrap bg-navy-deep/60 p-2 rounded leading-relaxed">{stripMarkdownToPlain(v)}</p>
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
            {(() => {
              // テスト・スモークデータを除外（一覧に表示しない）
              const realFeedbacks = feedbacks.filter(f => {
                const email = f.dna_diagnoses?.email ?? '';
                const firstName = f.dna_diagnoses?.first_name ?? '';
                return !email.includes('smoke') &&
                       !email.includes('e2e') &&
                       !email.includes('test') &&
                       firstName !== 'テスト' &&
                       firstName !== 'Test';
              });
              return (
            <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gold">感想一覧 <span className="text-offwhite-dim/60 font-normal ml-2">{realFeedbacks.length}件</span></h2>
              <button onClick={() => void loadFeedbacks()} className="text-xs border border-gold/40 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/10">再読み込み</button>
            </div>
            {realFeedbacks.length === 0 ? (
              <p className="text-offwhite-dim/50 text-sm text-center py-16">まだ感想はありません</p>
            ) : (
              <div className="space-y-3">
                {realFeedbacks.map(f => {
                  const diag = f.dna_diagnoses;
                  const name = [diag?.last_name, diag?.first_name].filter(Boolean).join(' ') || diag?.clone_display_name || '(no-name)';
                  return (
                    <div key={f.id} className="bg-navy-soft/40 border border-gold/15 rounded-xl px-5 py-4 hover:border-gold/30">
                      <div className="flex flex-wrap items-baseline gap-3 mb-2">
                        <span className="text-sm font-bold text-offwhite">{name}</span>
                        <span className="text-[11px] text-offwhite-dim/50">{diag?.email}</span>
                        <span className="text-[11px] text-offwhite-dim/40 ml-auto">{toJST(f.created_at)} JST</span>
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
            </>
              );
            })()}
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

            {/* 送信履歴 */}
            {sendLogs.length > 0 && (
              <div className="bg-navy-soft/40 border border-gold/15 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs text-gold/70 uppercase tracking-wider">送信履歴</h3>
                  <button onClick={() => void loadSendLogs()} className="text-xs text-offwhite-dim/50 hover:text-offwhite">更新</button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sendLogs.map(log => {
                    const toLabel = log.to_type === 'all' ? '全員' : log.to_type === 'completed' ? '完了者' : '個別選択';
                    const dateStr = new Date(log.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={log.id} className="flex items-start gap-3 text-xs border-b border-offwhite-dim/10 pb-2 last:border-0">
                        <span className="text-offwhite-dim/40 whitespace-nowrap pt-0.5">{dateStr}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-offwhite truncate">{log.subject}</p>
                          <p className="text-offwhite-dim/50 mt-0.5">{toLabel} / 成功{log.sent}件{log.failed > 0 && <span className="text-amber-400"> 失敗{log.failed}件</span>}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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


        {/* ── TAB: ページ管理（マイページ全員共通レイアウト） ── */}
        {activeTab === 'pages' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-bold text-gold">
                マイページ・レイアウト編集
                <span className="text-offwhite-dim/60 font-normal ml-2">（全ユーザー共通・即時反映）</span>
              </h2>
              <div className="flex items-center gap-2">
                <a
                  href="/me/preview"
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs border border-gold/40 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/10"
                >
                  サンプルで確認
                </a>
                <button
                  onClick={() => void loadMypageLayout()}
                  className="text-xs border border-offwhite-dim/30 text-offwhite-dim hover:text-offwhite px-3 py-1.5 rounded-lg"
                >
                  再読み込み
                </button>
              </div>
            </div>

            {layoutEdit.loading && <p className="text-xs text-offwhite-dim/60">読み込み中…</p>}
            {layoutEdit.error && <p className="text-xs text-red-300">{layoutEdit.error}</p>}

            {layoutEdit.draft && (
              <div className="space-y-5">
                {/* ヘッダー */}
                <div className="bg-navy-soft/40 border border-gold/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-gold/80 uppercase tracking-wider font-bold">ヘッダー</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Field label="ラベル（小さい英字 例: My Page）">
                      <input
                        type="text"
                        value={layoutEdit.draft.header.label}
                        onChange={e => updateLayout(l => ({ ...l, header: { ...l.header, label: e.target.value } }))}
                        className="w-full bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none"
                      />
                    </Field>
                    <Field label="サブタイトル（タイトル下の説明）">
                      <input
                        type="text"
                        value={layoutEdit.draft.header.subtitle}
                        onChange={e => updateLayout(l => ({ ...l, header: { ...l.header, subtitle: e.target.value } }))}
                        className="w-full bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none"
                      />
                    </Field>
                  </div>
                </div>

                {/* 導入ブロック */}
                <div className="bg-navy-soft/40 border border-gold/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gold/80 uppercase tracking-wider font-bold">導入メッセージ（最上部の目立つボックス）</p>
                    <label className="flex items-center gap-2 text-xs text-offwhite-dim cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layoutEdit.draft.intro.visible}
                        onChange={e => updateLayout(l => ({ ...l, intro: { ...l.intro, visible: e.target.checked } }))}
                        className="accent-gold"
                      />
                      <span>表示する</span>
                    </label>
                  </div>
                  <Field label="見出し">
                    <input
                      type="text"
                      value={layoutEdit.draft.intro.title}
                      onChange={e => updateLayout(l => ({ ...l, intro: { ...l.intro, title: e.target.value } }))}
                      className="w-full bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none"
                    />
                  </Field>
                  <Field label="本文">
                    <textarea
                      value={layoutEdit.draft.intro.body}
                      onChange={e => updateLayout(l => ({ ...l, intro: { ...l.intro, body: e.target.value } }))}
                      rows={4}
                      className="w-full bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none resize-y leading-relaxed"
                    />
                  </Field>
                </div>

                {/* お知らせブロック */}
                <div className="bg-navy-soft/40 border border-gold/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gold/80 uppercase tracking-wider font-bold">お知らせブロック（任意・キャンペーンや新機能告知用）</p>
                    <label className="flex items-center gap-2 text-xs text-offwhite-dim cursor-pointer">
                      <input
                        type="checkbox"
                        checked={layoutEdit.draft.announcement.visible}
                        onChange={e => updateLayout(l => ({ ...l, announcement: { ...l.announcement, visible: e.target.checked } }))}
                        className="accent-gold"
                      />
                      <span>表示する</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Field label="見出し">
                      <input
                        type="text"
                        value={layoutEdit.draft.announcement.title}
                        onChange={e => updateLayout(l => ({ ...l, announcement: { ...l.announcement, title: e.target.value } }))}
                        placeholder="例: 新機能のお知らせ"
                        className="w-full bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none"
                      />
                    </Field>
                    <Field label="リンクURL（任意）">
                      <input
                        type="text"
                        value={layoutEdit.draft.announcement.linkUrl}
                        onChange={e => updateLayout(l => ({ ...l, announcement: { ...l.announcement, linkUrl: e.target.value } }))}
                        placeholder="https://..."
                        className="w-full bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none"
                      />
                    </Field>
                  </div>
                  <Field label="本文">
                    <textarea
                      value={layoutEdit.draft.announcement.body}
                      onChange={e => updateLayout(l => ({ ...l, announcement: { ...l.announcement, body: e.target.value } }))}
                      rows={3}
                      className="w-full bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none resize-y leading-relaxed"
                    />
                  </Field>
                  <Field label="リンク文言">
                    <input
                      type="text"
                      value={layoutEdit.draft.announcement.linkText}
                      onChange={e => updateLayout(l => ({ ...l, announcement: { ...l.announcement, linkText: e.target.value } }))}
                      placeholder="例: 詳しく見る"
                      className="w-full bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none"
                    />
                  </Field>
                </div>

                {/* セクション順序＋表示制御 */}
                <div className="bg-navy-soft/40 border border-gold/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-gold/80 uppercase tracking-wider font-bold">セクション順序・表示・見出し文言</p>
                  <p className="text-[11px] text-offwhite-dim/60">
                    上から順にマイページに表示されます。各セクションの見出し文言を直接編集できます。
                  </p>
                  <div className="space-y-2">
                    {layoutEdit.draft.sections.map((s, idx) => {
                      const specs = SECTION_FIELD_SPECS[s.key as LayoutSectionKey] ?? [];
                      const isExpanded = expandedSection === s.key;
                      return (
                        <div key={s.key} className={`bg-navy-deep/40 border rounded-lg ${isExpanded ? 'border-gold' : 'border-gold/15'}`}>
                          <div className="p-3 flex items-center gap-2 flex-wrap">
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                onClick={() => moveSection(idx, -1)}
                                disabled={idx === 0}
                                className="text-[10px] border border-offwhite-dim/30 text-offwhite-dim hover:text-gold hover:border-gold/40 px-1.5 rounded disabled:opacity-20"
                              >↑</button>
                              <button
                                type="button"
                                onClick={() => moveSection(idx, 1)}
                                disabled={idx === layoutEdit.draft!.sections.length - 1}
                                className="text-[10px] border border-offwhite-dim/30 text-offwhite-dim hover:text-gold hover:border-gold/40 px-1.5 rounded disabled:opacity-20"
                              >↓</button>
                            </div>
                            <span className="text-[10px] text-offwhite-dim/60 font-mono w-24">{s.key}</span>
                            <label className="flex items-center gap-1.5 text-[11px] text-offwhite-dim cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={s.visible}
                                onChange={e => updateLayout(l => ({
                                  ...l,
                                  sections: l.sections.map((x, i) => i === idx ? { ...x, visible: e.target.checked } : x),
                                }))}
                                className="accent-gold"
                              />
                              <span>表示</span>
                            </label>
                            <input
                              type="text"
                              value={s.title}
                              onChange={e => updateLayout(l => ({
                                ...l,
                                sections: l.sections.map((x, i) => i === idx ? { ...x, title: e.target.value } : x),
                              }))}
                              className="flex-1 min-w-[200px] bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none"
                            />
                            {specs.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setExpandedSection(isExpanded ? null : s.key)}
                                className={`text-[10px] border px-2 py-1 rounded shrink-0 ${isExpanded ? 'border-gold text-gold bg-gold/10' : 'border-gold/40 text-gold/80 hover:bg-gold/10'}`}
                              >
                                {isExpanded ? '閉じる' : `内容を編集（${specs.length}項目）`}
                              </button>
                            ) : (
                              <span className="text-[10px] text-offwhite-dim/40 shrink-0 px-2">編集項目なし</span>
                            )}
                          </div>

                          {/* 展開時：fields 編集パネル */}
                          {isExpanded && specs.length > 0 && (
                            <div className="border-t border-gold/20 p-3 space-y-3 bg-navy-deep/30">
                              <p className="text-[10px] text-offwhite-dim/50">
                                各項目を空にするとマイページ側で非表示になります（一部）。
                                変更は「保存して全ユーザーに反映」ボタンで確定します。
                              </p>
                              {specs.map(spec => (
                                <Field key={spec.key} label={spec.label}>
                                  {spec.multiline ? (
                                    <textarea
                                      value={s.fields[spec.key] ?? ''}
                                      onChange={e => updateSectionField(idx, spec.key, e.target.value)}
                                      rows={3}
                                      className="w-full bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none resize-y leading-relaxed"
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={s.fields[spec.key] ?? ''}
                                      onChange={e => updateSectionField(idx, spec.key, e.target.value)}
                                      className="w-full bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none"
                                    />
                                  )}
                                  {spec.hint && (
                                    <p className="text-[10px] text-offwhite-dim/50 mt-0.5">{spec.hint}</p>
                                  )}
                                </Field>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* フッター */}
                <div className="bg-navy-soft/40 border border-gold/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-gold/80 uppercase tracking-wider font-bold">フッター注意書き</p>
                  <Field label="本文">
                    <textarea
                      value={layoutEdit.draft.footer.note}
                      onChange={e => updateLayout(l => ({ ...l, footer: { ...l.footer, note: e.target.value } }))}
                      rows={2}
                      className="w-full bg-navy-deep/60 border border-gold/30 rounded px-2 py-1.5 text-offwhite text-xs focus:border-gold outline-none resize-y leading-relaxed"
                    />
                  </Field>
                </div>

                {/* 保存バー */}
                <div className="sticky bottom-0 bg-navy-deep/95 backdrop-blur border border-gold/30 rounded-xl p-3 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => void saveMypageLayout()}
                    disabled={layoutEdit.saving}
                    className="px-5 py-2 bg-gold text-navy-deep font-bold rounded-lg text-sm hover:bg-gold-light disabled:opacity-40"
                  >
                    {layoutEdit.saving ? '保存中…' : '保存して全ユーザーに反映'}
                  </button>
                  <button
                    type="button"
                    onClick={resetLayoutDraft}
                    disabled={layoutEdit.saving}
                    className="text-xs border border-offwhite-dim/30 text-offwhite-dim hover:text-offwhite px-3 py-1.5 rounded-lg"
                  >
                    変更を取り消す
                  </button>
                  {layoutEdit.savedAt && (
                    <span className="text-xs text-emerald-300">
                      保存しました（{new Date(layoutEdit.savedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit' })}）
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

      </div>
    </main>
  );
}

// 編集中のテキスト本文を、API側 buildMailContent と同じ装飾フレーム内に流し込む
// （client側プレビュー用。送信時は API 側が同じロジックで再生成する＝表示と送信が一致する）
function renderHtmlFromText(text: string, myPageUrl: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const textHtml = esc(text)
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 14px;white-space:pre-wrap;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:'Noto Sans JP',-apple-system,sans-serif;background:#fbfaf6;color:#1f2937;padding:24px;line-height:1.7;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e0d3;border-radius:12px;padding:32px;">
    <p style="color:#c9a44b;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">DNA SHINDAN AI</p>
    <h1 style="font-size:20px;color:#0a1f44;margin:0 0 20px;">レポートが完成しました</h1>
    ${textHtml}
    <p style="text-align:center;margin:28px 0;">
      <a href="${myPageUrl}" style="display:inline-block;background:#c9a44b;color:#0a1f44;padding:14px 32px;border-radius:24px;text-decoration:none;font-weight:bold;">
        マイページを開く
      </a>
    </p>
    <p style="background:#fbfaf6;padding:16px;border-left:3px solid #c9a44b;border-radius:4px;font-size:14px;">
      <strong style="color:#0a1f44;">マイページでできること</strong><br>
      ・50ページ以上のPDFレポートをダウンロード<br>
      ・あなた専用の分身AIボットと対話<br>
      ・初回ログイン時にパスワードを設定（次回以降ブラウザに自動保存）
    </p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;">
      このリンクは本人専用です。第三者に共有しないでください。<br>
      お問い合わせ：<a href="mailto:dna@kami-ai.jp" style="color:#c9a44b;">dna@kami-ai.jp</a>
    </p>
  </div>
</body></html>`;
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] text-offwhite-dim/70 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}
