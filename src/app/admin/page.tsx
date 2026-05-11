'use client';

import { useEffect, useState } from 'react';

// フロントエンドではパスワードをハードコードしない。
// ユーザーが入力したパスワードをそのままAPIに渡して検証させる設計に統一。
// （クライアント側でのチェックはAPI側でも検証されるため、セキュリティ上は問題ない）

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

  const handleLogin = async (pw?: string) => {
    const usePw = pw ?? pass;
    if (!usePw) return;
    const r = await fetch(`/api/admin/stats?pass=${encodeURIComponent(usePw)}`);
    if (r.ok) {
      setStats(await r.json());
      setAuthed(true);
      // セッション維持のためlocalStorageに保存
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('admin-pass', usePw);
      }
    } else {
      setLoginError('パスワードが違います');
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('admin-pass');
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlPass = params.get('pass');
    const savedPass = window.localStorage.getItem('admin-pass');

    // URLパスワード優先、次にlocalStorage保存済みパスワード
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
      if (r.ok) {
        setSelected(null);
        await loadStats();
      }
    } finally {
      setHidingId(null);
    }
  };

  const handleToggleShowHidden = async () => {
    const next = !showHidden;
    setShowHidden(next);
    await loadStats(next);
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

  // 直近30日の日次集計（クライアント側でrows から導出）
  const dailyApiCost: Record<string, number> = {};
  const dailyDownloads: Record<string, number> = {};
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyApiCost[key] = 0;
    dailyDownloads[key] = 0;
  }
  for (const r of stats.rows) {
    if (r.completed_at) {
      const d = r.completed_at.slice(0, 10);
      if (d in dailyApiCost) {
        dailyApiCost[d] = Number((dailyApiCost[d] + (r.api_cost_usd ?? 0)).toFixed(4));
      }
    }
    if (r.last_downloaded_at && (r.download_count ?? 0) > 0) {
      const d = r.last_downloaded_at.slice(0, 10);
      if (d in dailyDownloads) dailyDownloads[d]++;
    }
  }

  return (
    <main className="min-h-screen bg-navy-deep text-offwhite px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gold/20">
          <h1 className="text-2xl font-bold text-gold">診断データ管理</h1>
          <div className="flex items-center gap-2">
            <a
              href="https://supabase.com/dashboard/project/utcsldezxxjeednyxovs/editor"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gold/40 text-gold px-3 py-1.5 rounded-lg text-sm hover:bg-gold/10"
            >
              DBを開く（メールアドレス一覧）
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

        {/* APIコスト・予算アラート */}
        <section className={`rounded-2xl border p-5 ${stats.summary.alert ? 'border-red-500/60 bg-red-900/20' : 'border-gold/30 bg-navy-soft/40'}`}>
          <div className="flex flex-wrap justify-between items-baseline gap-3">
            <h2 className="text-lg font-bold text-gold">API使用量・予算</h2>
            {stats.summary.alert && (
              <span className="text-red-300 text-sm font-bold">⚠️ {stats.summary.alertThresholdPercent}%超過 — 追加チャージ推奨</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <KPI label="累計コスト" value={`$${stats.summary.totalCost.toFixed(2)}`} />
            <KPI label="予算上限" value={`$${stats.summary.apiBudgetUsd}`} />
            <KPI label="残量" value={`$${stats.summary.apiRemainingUsd}`} />
            <KPI label="使用率" value={`${stats.summary.apiUsagePercent}%`} />
          </div>
          <div className="mt-3 h-2 rounded-full bg-offwhite-dim/15 overflow-hidden">
            <div
              className={`h-full ${stats.summary.alert ? 'bg-red-400' : 'bg-gradient-to-r from-gold to-gold-light'}`}
              style={{ width: `${Math.min(100, stats.summary.apiUsagePercent)}%` }}
            />
          </div>
          <p className="text-xs text-offwhite-dim/70 mt-2">
            予算上限は env <code>ANTHROPIC_BUDGET_USD</code>（既定$200）。Anthropic Console でチャージした額に合わせて変更可。
          </p>
        </section>

        {/* 全体KPI */}
        <section className="bg-navy-soft/40 border border-gold/20 rounded-2xl p-5">
          <h2 className="text-lg font-bold text-gold mb-3">サマリ</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPI label="総診断数" value={stats.summary.total.toString()} />
            <KPI label="累計DL回数" value={stats.summary.totalDownloads.toString()} />
            <KPI label="累計チャット" value={stats.summary.totalChats.toString()} />
            <KPI label="平均コスト/件" value={stats.summary.total > 0 ? `$${(stats.summary.totalCost / stats.summary.total).toFixed(3)}` : '—'} />
          </div>
        </section>

        {/* ステータス・関係性 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BreakdownCard title="ステータス内訳" data={stats.statusBreakdown} />
          <BreakdownCard title="関係性タグ内訳" data={stats.relationBreakdown} />
        </section>

        {/* 直近30日の各種グラフ */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DailyBarChart
            title="新規登録（日次）"
            data={stats.dailyRegistrations}
            formatValue={(n) => `${n}件`}
            total={`${Object.values(stats.dailyRegistrations).reduce((a, b) => a + b, 0)}件 / 30日`}
          />
          <DailyBarChart
            title="PDFダウンロード（日次）"
            data={dailyDownloads}
            formatValue={(n) => `${n}人`}
            total={`${Object.values(dailyDownloads).reduce((a, b) => a + b, 0)}人 / 30日`}
            color="bg-blue-400"
          />
          <DailyBarChart
            title="API使用量（日次・$）"
            data={dailyApiCost}
            formatValue={(n) => `$${n.toFixed(3)}`}
            total={`$${Object.values(dailyApiCost).reduce((a, b) => a + b, 0).toFixed(3)} / 30日`}
            color="bg-emerald-400"
          />
        </section>

        {/* 診断リスト＋詳細 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 space-y-2 max-h-[80vh] overflow-y-auto pr-1">
            {stats.rows.map((r, i) => (
              <div key={r.id} className={`relative rounded-lg border ${r.hidden_at ? 'border-offwhite-dim/20 opacity-50' : selected === i ? 'border-gold bg-gold/10' : 'border-gold/20 bg-navy-soft/40'}`}>
                <button
                  onClick={() => setSelected(i)}
                  className="w-full text-left p-3"
                >
                  <p className="text-sm text-offwhite font-bold pr-8">
                    {[r.last_name, r.first_name].filter(Boolean).join(' ') || r.clone_display_name || '(no-name)'}
                    {r.hidden_at && <span className="ml-2 text-[10px] text-offwhite-dim/50 font-normal">非表示</span>}
                  </p>
                  <p className="text-xs text-offwhite-dim">{r.email}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-offwhite-dim/60 mt-1">
                    <span>状態:{r.status}</span>
                    <span>DL:{r.download_count ?? 0}</span>
                    <span>Chat:{r.chat_count ?? 0}</span>
                    <span>${(r.api_cost_usd ?? 0).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gold/60 mt-1">{r.created_at?.slice(0, 16).replace('T', ' ')}</p>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); void handleHide(r.id, !!r.hidden_at); }}
                  disabled={hidingId === r.id}
                  title={r.hidden_at ? '再表示する' : '非表示にする'}
                  className="absolute top-2 right-2 text-[10px] text-offwhite-dim/50 hover:text-red-400 px-1.5 py-0.5 rounded border border-transparent hover:border-red-400/40"
                >
                  {hidingId === r.id ? '…' : r.hidden_at ? '再表示' : '非表示'}
                </button>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 bg-navy-soft/40 border border-gold/20 rounded-xl p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {sel ? (
              <>
                <div className="border-b border-gold/20 pb-3 space-y-2">
                  <div className="flex flex-wrap gap-2 items-baseline">
                    {/* admin は YO 本人専用画面なので本名OK（公開URLは clone_display_name のまま） */}
                    <h2 className="text-lg font-bold text-gold">{[sel.last_name, sel.first_name].filter(Boolean).join(' ') || sel.clone_display_name || '(no-name)'}</h2>
                    <span className="text-xs text-offwhite-dim">{sel.email}</span>
                  </div>
                  {/* PDF・分身AIリンク */}
                  <div className="flex flex-wrap gap-2">
                    {sel.access_token && sel.status === 'completed' ? (
                      <a
                        href={`/api/me/${sel.id}/pdf?token=${sel.access_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs border border-gold/40 text-gold px-3 py-1 rounded-lg hover:bg-gold/10"
                      >
                        PDFダウンロード
                      </a>
                    ) : (
                      <span className="text-xs text-offwhite-dim/40 border border-offwhite-dim/20 px-3 py-1 rounded-lg">PDF（未完了）</span>
                    )}
                    <a
                      href={`/clone/${sel.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs border border-gold/40 text-gold px-3 py-1 rounded-lg hover:bg-gold/10"
                    >
                      分身AIを開く
                    </a>
                    <a
                      href={`/me/${sel.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs border border-offwhite-dim/30 text-offwhite-dim px-3 py-1 rounded-lg hover:bg-offwhite-dim/10"
                    >
                      マイページ
                    </a>
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
                  <KV label="状態" value={sel.status ?? '—'} />
                  <KV label="関係性" value={sel.relationship_tag ?? '—'} />
                  <KV label="DL回数" value={(sel.download_count ?? 0).toString()} />
                  <KV label="Chat回数" value={(sel.chat_count ?? 0).toString()} />
                  <KV label="APIコスト" value={`$${(sel.api_cost_usd ?? 0).toFixed(3)}`} />
                  <KV label="登録" value={sel.created_at?.slice(0, 16).replace('T', ' ') ?? '—'} />
                  <KV label="完了" value={sel.completed_at?.slice(0, 16).replace('T', ' ') ?? '—'} />
                  <KV label="最終DL" value={sel.last_downloaded_at?.slice(0, 16).replace('T', ' ') ?? '—'} />
                </div>

                {/* 質問×回答 */}
                <details open className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
                  <summary className="cursor-pointer text-sm font-bold text-gold/80">選択回答（Q5〜Q30）— 質問×選択肢を表示</summary>
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

                {/* 本人の自由記述 */}
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

                {/* 文体 */}
                {sel.style_sample && (
                  <details className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
                    <summary className="cursor-pointer text-sm font-bold text-gold/80">文体サンプル（Q38）</summary>
                    <p className="text-xs text-offwhite-dim mt-2 whitespace-pre-wrap bg-navy-deep/60 p-2 rounded">{sel.style_sample}</p>
                  </details>
                )}

                {/* スコア・命術 */}
                <details className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
                  <summary className="cursor-pointer text-sm font-bold text-gold/80">心理スコア</summary>
                  <pre className="text-[10px] text-offwhite-dim mt-2 bg-navy-deep/60 p-2 rounded overflow-x-auto max-h-72">
                    {JSON.stringify(sel.scores, null, 2)}
                  </pre>
                </details>
                <details className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
                  <summary className="cursor-pointer text-sm font-bold text-gold/80">命術16結果</summary>
                  <pre className="text-[10px] text-offwhite-dim mt-2 bg-navy-deep/60 p-2 rounded overflow-x-auto max-h-72">
                    {JSON.stringify(sel.celestial_results, null, 2)}
                  </pre>
                </details>

                {/* レポート全文 */}
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
      </div>
    </main>
  );
}

function DailyBarChart({
  title,
  data,
  formatValue,
  total,
  color = 'bg-gold',
}: {
  title: string;
  data: Record<string, number>;
  formatValue: (n: number) => string;
  total: string;
  color?: string;
}) {
  const entries = Object.entries(data).reverse();
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className="bg-navy-soft/40 border border-gold/20 rounded-2xl p-4">
      <h2 className="text-sm font-bold text-gold mb-3">{title}</h2>
      <div className="flex items-end gap-0.5 h-20">
        {entries.map(([d, n]) => {
          const h = (n / max) * 100;
          return (
            <div key={d} className="flex-1 min-w-[6px] flex flex-col items-center justify-end" title={`${d}: ${formatValue(n)}`}>
              <div className={`w-full ${n > 0 ? color : 'bg-offwhite-dim/15'}`} style={{ height: `${Math.max(2, h)}%` }} />
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-offwhite-dim/60 mt-2">{total}</p>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-deep/40 border border-offwhite-dim/15 rounded-lg p-3">
      <p className="text-[10px] text-offwhite-dim/70 uppercase tracking-wider">{label}</p>
      <p className="text-lg sm:text-xl font-bold text-gold mt-1">{value}</p>
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

function BreakdownCard({ title, data }: { title: string; data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  return (
    <div className="bg-navy-soft/40 border border-gold/20 rounded-2xl p-5">
      <h2 className="text-base font-bold text-gold mb-3">{title}</h2>
      <div className="space-y-1.5">
        {Object.entries(data).map(([k, v]) => {
          const pct = total > 0 ? Math.round((v / total) * 100) : 0;
          return (
            <div key={k} className="flex items-center gap-2 text-xs">
              <span className="w-32 truncate text-offwhite-dim">{k}</span>
              <div className="flex-1 h-1.5 bg-offwhite-dim/15 rounded-full overflow-hidden">
                <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-10 text-right text-offwhite font-bold">{v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
