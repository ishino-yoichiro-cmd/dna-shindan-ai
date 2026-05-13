// GET /api/admin/stats?pass=yo-admin
// 管理画面用：全件サマリ、API使用量、新規登録、ダウンロード、チャット統計
// service_role で Supabase 直読み。pass で簡易認証。

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeRow } from '@/lib/sanitize/real-name';

export const runtime = 'nodejs';

// 管理者パスワードは環境変数から取得（ADMIN_PASSWORD が未設定の場合は起動させない）
const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? '';
// API予算上限（USD）— Anthropic Console でチャージした金額をここで管理
// env 必須（DEFAULT 値ハードコード禁止 verify Phase 2 P0-1）
function getApiBudgetUsd(): number {
  const v = process.env.ANTHROPIC_BUDGET_USD;
  if (!v) throw new Error('ANTHROPIC_BUDGET_USD env is required');
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('ANTHROPIC_BUDGET_USD must be a positive number');
  }
  return n;
}
const API_ALERT_THRESHOLD = 0.8; // 80%超でアラート

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // N-001対策: Authorization: Bearer <pass> ヘッダー優先（クエリパラメータはURLログに残るため非推奨）
  // 後方互換のため ?pass= クエリも引き続き受け付けるが、ヘッダー方式を推奨
  const authHeader = req.headers.get('authorization') ?? '';
  const bearerPass = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const queryPass = url.searchParams.get('pass') ?? '';
  const pass = bearerPass || queryPass;
  if (!ADMIN_PASS || pass !== ADMIN_PASS) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) return Response.json({ ok: false, error: 'server' }, { status: 500 });
  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await supa
    .from('dna_diagnoses')
    .select('id, first_name, last_name, email, status, relationship_tag, download_count, chat_count, api_cost_usd, created_at, last_downloaded_at, last_chat_at, completed_at, select_answers, narrative_answers, style_sample, scores, celestial_results, clone_display_name, report_text, access_token, hidden_at')
    .order('created_at', { ascending: false });

  // 感想数を一括取得（N+1回避）
  const { data: feedbackCounts } = await supa
    .from('dna_feedbacks')
    .select('diagnosis_id');

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  // YO 指示: admin は YO 本人専用 UI なので本名表示OK。sanitize は公開向けでのみ適用。
  // 万が一 admin URL が漏れた時のため、`?sanitize=1` クエリで明示的に sanitize 可能に。
  const shouldSanitize = url.searchParams.get('sanitize') === '1';
  // ?show_hidden=1 で非表示レコードも表示（デフォルト: hidden_at IS NULL のみ）
  const showHidden = url.searchParams.get('show_hidden') === '1';

  // 感想数を diagnosis_id ごとにカウント
  const feedbackCountMap: Record<string, number> = {};
  for (const f of feedbackCounts ?? []) {
    feedbackCountMap[f.diagnosis_id] = (feedbackCountMap[f.diagnosis_id] ?? 0) + 1;
  }

  // テスト名パターン判定（hidden_at 未設定でも常にデフォルト非表示）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isTestRecord = (r: any): boolean => {
    const names = [r.first_name, r.last_name, r.clone_display_name]
      .map((n: unknown) => (typeof n === 'string' ? n.toLowerCase() : ''));
    return names.some((n) => n.includes('テスト') || n.includes('test'));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRows = ((data ?? []) as any[]).map((r) => ({
    ...(shouldSanitize ? sanitizeRow(r) : r),
    feedback_count: feedbackCountMap[r.id] ?? 0,
  }));
  const rows = showHidden
    ? allRows
    : allRows.filter((r) => !r.hidden_at && !isTestRecord(r));

  const totalCost = rows.reduce((s, r) => s + (Number(r.api_cost_usd) || 0), 0);
  const totalDownloads = rows.reduce((s, r) => s + (r.download_count || 0), 0);
  const totalChats = rows.reduce((s, r) => s + (r.chat_count || 0), 0);

  // 日次新規登録（直近30日）
  const today = new Date();
  const dailyMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of rows) {
    const d = (r.created_at as string)?.slice(0, 10);
    if (d in dailyMap) dailyMap[d]++;
  }

  // ステータス内訳
  const statusBreakdown: Record<string, number> = {};
  for (const r of rows) {
    statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;
  }

  // 関係性タグ内訳
  const relationBreakdown: Record<string, number> = {};
  for (const r of rows) {
    const t = r.relationship_tag ?? '未設定';
    relationBreakdown[t] = (relationBreakdown[t] || 0) + 1;
  }

  const apiBudget = getApiBudgetUsd();
  const usageRatio = totalCost / apiBudget;
  const alert = usageRatio >= API_ALERT_THRESHOLD;

  return Response.json({
    ok: true,
    summary: {
      total: rows.length,
      totalCost: Number(totalCost.toFixed(4)),
      totalDownloads,
      totalChats,
      apiBudgetUsd: apiBudget,
      apiUsagePercent: Number((usageRatio * 100).toFixed(1)),
      apiRemainingUsd: Number((apiBudget - totalCost).toFixed(2)),
      alert,
      alertThresholdPercent: API_ALERT_THRESHOLD * 100,
    },
    statusBreakdown,
    relationBreakdown,
    dailyRegistrations: dailyMap,
    rows,
  });
}
