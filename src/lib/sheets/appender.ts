/**
 * DNA診断AI — スプシ追記処理
 *
 * appendDiagnosisToSheet(diagnosisId):
 *   1. Supabase から diagnoses + celestial_results + scores + narratives + reports + clones + email_logs を取得
 *   2. DiagnosisSheetRow に整形 (formatter.ts)
 *   3. Google Sheets API で1行 append
 *
 * 1行 = 1診断 (A〜AS の45列)
 */

import { getSheetsClient, getSheetsEnv } from './client';
import {
  formatCelestial,
  formatScores,
  formatNarratives,
  formatTags,
} from './formatter';
import {
  SHEET_COLUMN_ORDER,
  type DiagnosisSheetRow,
} from './types';
import { getSupabaseServiceRoleClient } from '../supabase/server';
import type { Database } from '../supabase/database.types';

// ============================================================================
// 型
// ============================================================================

export interface AppendDiagnosisOptions {
  /** 検証専用: 実際に append せずに整形済み行を返すだけ */
  dryRun?: boolean;
}

export interface AppendDiagnosisResult {
  ok: boolean;
  /** スプシで追記された範囲 (例: 'diagnoses!A123:AS123') */
  updatedRange: string | null;
  /** 整形済みの行データ (dryRun 時もしくはデバッグ用) */
  row: DiagnosisSheetRow;
  error?: string;
}

// ============================================================================
// メイン関数
// ============================================================================

export async function appendDiagnosisToSheet(
  diagnosisId: string,
  opts: AppendDiagnosisOptions = {},
): Promise<AppendDiagnosisResult> {
  const supabase = getSupabaseServiceRoleClient();

  // ---- 1. 各テーブルを並列取得 ----
  const [
    diagRes,
    celestialRes,
    scoresRes,
    narrativesRes,
    reportRes,
    cloneRes,
    emailLogRes,
  ] = await Promise.all([
    supabase.from('diagnoses').select('*').eq('id', diagnosisId).maybeSingle(),
    supabase
      .from('celestial_results')
      .select('results_json')
      .eq('diagnosis_id', diagnosisId)
      .maybeSingle(),
    supabase
      .from('scores')
      .select('scores_json')
      .eq('diagnosis_id', diagnosisId)
      .maybeSingle(),
    supabase
      .from('narratives')
      .select('*')
      .eq('diagnosis_id', diagnosisId),
    supabase
      .from('reports')
      .select('public_url')
      .eq('diagnosis_id', diagnosisId)
      .maybeSingle(),
    supabase
      .from('clones')
      .select('public_url')
      .eq('diagnosis_id', diagnosisId)
      .maybeSingle(),
    supabase
      .from('email_logs')
      .select('opened_at')
      .eq('diagnosis_id', diagnosisId)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (diagRes.error || !diagRes.data) {
    return {
      ok: false,
      updatedRange: null,
      row: emptyRow(diagnosisId),
      error: `[sheets/appender] diagnoses 取得失敗: ${diagRes.error?.message ?? 'not found'}`,
    };
  }

  // ---- 2. 整形 ----
  const row = buildRow({
    diag: diagRes.data,
    celestial: celestialRes.data?.results_json ?? null,
    scores: scoresRes.data?.scores_json ?? null,
    narratives: narrativesRes.data ?? [],
    reportUrl: reportRes.data?.public_url ?? null,
    cloneUrl: cloneRes.data?.public_url ?? null,
    emailOpenedAt: emailLogRes.data?.opened_at ?? null,
  });

  if (opts.dryRun) {
    return { ok: true, updatedRange: null, row };
  }

  // ---- 3. Sheets API で append ----
  const sheets = getSheetsClient();
  const env = getSheetsEnv();

  // SHEET_COLUMN_ORDER の順で配列化
  const values = [SHEET_COLUMN_ORDER.map((k) => row[k] ?? '')];

  try {
    const resp = await sheets.spreadsheets.values.append({
      spreadsheetId: env.spreadsheetId,
      range: `${env.tabName}!A:AS`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });

    return {
      ok: true,
      updatedRange: resp.data.updates?.updatedRange ?? null,
      row,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      updatedRange: null,
      row,
      error: `[sheets/appender] Sheets API append 失敗: ${message}`,
    };
  }
}

// ============================================================================
// 行構築
// ============================================================================

interface BuildRowInput {
  diag: Database['public']['Tables']['diagnoses']['Row'];
  celestial: Database['public']['Tables']['celestial_results']['Row']['results_json'] | null;
  scores: Database['public']['Tables']['scores']['Row']['scores_json'] | null;
  narratives: Database['public']['Tables']['narratives']['Row'][];
  reportUrl: string | null;
  cloneUrl: string | null;
  emailOpenedAt: string | null;
}

export function buildRow(input: BuildRowInput): DiagnosisSheetRow {
  const { diag } = input;

  const celestial = formatCelestial(input.celestial);
  const scores = formatScores(input.scores);
  const narratives = formatNarratives(input.narratives);

  return {
    A_timestamp: diag.completed_at ?? diag.created_at ?? '',
    B_userId: diag.id,
    C_fullName: diag.full_name ?? '',
    D_email: diag.email ?? '',
    E_relationshipTag: (diag.relationship_tag ?? '') as DiagnosisSheetRow['E_relationshipTag'],
    F_birthDate: diag.birth_date ?? '',
    G_birthTime: (diag.birth_time ?? '').slice(0, 5),
    H_birthPlace: diag.birth_place_name ?? '',

    ...celestial,
    ...scores,
    ...narratives,

    AO_tags: formatTags(diag.metadata),
    AP_pdfUrl: input.reportUrl ?? '',
    AQ_cloneUrl: input.cloneUrl ?? '',
    AR_emailOpened: input.emailOpenedAt ? 'opened' : '',
    AS_lpSource: diag.lp_source ?? '',
  };
}

function emptyRow(id: string): DiagnosisSheetRow {
  // formatter の空状態を寄せ集める (型整合のため)
  const c = formatCelestial(null);
  const s = formatScores(null);
  const n = formatNarratives(null);

  return {
    A_timestamp: '',
    B_userId: id,
    C_fullName: '',
    D_email: '',
    E_relationshipTag: '',
    F_birthDate: '',
    G_birthTime: '',
    H_birthPlace: '',
    ...c,
    ...s,
    ...n,
    AO_tags: '',
    AP_pdfUrl: '',
    AQ_cloneUrl: '',
    AR_emailOpened: '',
    AS_lpSource: '',
  };
}
