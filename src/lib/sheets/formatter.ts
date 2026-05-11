/**
 * DNA診断AI — Supabase 行 → Google Sheets 行 整形ヘルパー
 *
 * 命術16・心理スコア・ナラティブ各種の jsonb から
 * 「人間が読む1セル文字列」を取り出す責務を一箇所に集約する。
 *
 * 命術16の各サブツリー構造はまだ実装途中なため、
 * ここでは "よくある形 (string / {value} / {name} / 配列など)" を可能な限りカバーする。
 */

import type {
  CelestialResultsJson,
  ScoresJson,
  NarrativesRow,
  Json,
} from '../supabase/database.types';
import type { DiagnosisSheetRow } from './types';

// ============================================================================
// 共通ヘルパ
// ============================================================================

/** 任意 jsonb 値を「セル向け短文」に潰す */
export function cellify(v: Json | undefined | null, maxLen = 200): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return truncate(v, maxLen);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    return truncate(
      v.map((x) => cellify(x as Json, 60)).filter(Boolean).join(' / '),
      maxLen,
    );
  }
  // object: 「いい感じ」のキーが含まれていれば取り出す
  const obj = v as Record<string, Json | undefined>;
  for (const key of [
    'label',
    'name',
    'kanji',
    'sign',
    'star',
    'kin',
    'value',
    'type',
    'summary',
    'main',
    'title',
  ]) {
    const got = obj[key];
    if (typeof got === 'string' || typeof got === 'number') {
      return truncate(String(got), maxLen);
    }
  }
  // 最終的にはJSON.stringify
  try {
    return truncate(JSON.stringify(v), maxLen);
  } catch {
    return '';
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

function getNested(obj: unknown, path: string[]): Json | undefined {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur && typeof cur === 'object' && k in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return cur as Json | undefined;
}

/** 複数候補パスを試して最初の hit を取る */
function pick(obj: unknown, paths: string[][], maxLen = 80): string {
  for (const path of paths) {
    const v = getNested(obj, path);
    if (v !== undefined && v !== null && v !== '') {
      return cellify(v as Json, maxLen);
    }
  }
  return '';
}

// ============================================================================
// 命術16 → I〜X
// ============================================================================

export function formatCelestial(c: CelestialResultsJson | null | undefined): {
  I_shichuu_dayPillar: string;
  J_kyusei_main: string;
  K_numerology_lifePath: string;
  L_western_sun: string;
  M_western_moon: string;
  N_western_asc: string;
  O_shibi_mainStar: string;
  P_shukuyou_xiu: string;
  Q_maya_kin: string;
  R_seimei_summary: string;
  S_animal_character: string;
  T_humanDesign_type: string;
  U_sanmei_summary: string;
  V_day366_type: string;
  W_season_type: string;
  X_celestial_other: string;
} {
  const empty = '';
  if (!c) {
    return {
      I_shichuu_dayPillar: empty,
      J_kyusei_main: empty,
      K_numerology_lifePath: empty,
      L_western_sun: empty,
      M_western_moon: empty,
      N_western_asc: empty,
      O_shibi_mainStar: empty,
      P_shukuyou_xiu: empty,
      Q_maya_kin: empty,
      R_seimei_summary: empty,
      S_animal_character: empty,
      T_humanDesign_type: empty,
      U_sanmei_summary: empty,
      V_day366_type: empty,
      W_season_type: empty,
      X_celestial_other: empty,
    };
  }

  return {
    // 四柱推命 日柱 (例: 甲子)
    I_shichuu_dayPillar: pick(c.shichuu, [
      ['dayPillar'],
      ['day', 'pillar'],
      ['day'],
      ['pillars', 'day'],
    ]),
    // 九星 本命星
    J_kyusei_main: pick(c.kyusei, [
      ['main'],
      ['mainStar'],
      ['honmei'],
      ['本命星'],
      ['honmeiStar'],
    ]),
    // 数秘 ライフパス
    K_numerology_lifePath: pick(c.numerology, [
      ['lifePath'],
      ['lifePathNumber'],
      ['ライフパス'],
      ['main'],
    ]),
    // 西洋占星 太陽
    L_western_sun: pick(c.western, [
      ['sun', 'sign'],
      ['sun'],
      ['sunSign'],
      ['planets', 'sun', 'sign'],
    ]),
    // 月
    M_western_moon: pick(c.western, [
      ['moon', 'sign'],
      ['moon'],
      ['moonSign'],
      ['planets', 'moon', 'sign'],
    ]),
    // ASC
    N_western_asc: pick(c.western, [
      ['ascendant', 'sign'],
      ['ascendant'],
      ['asc'],
      ['ASC'],
    ]),
    // 紫微斗数 主星 (命宮)
    O_shibi_mainStar: pick(c.shibi, [
      ['mainStar'],
      ['palaces', 'meigong', 'majorStars'],
      ['命宮', 'majorStars'],
      ['mingGong', 'majorStars'],
      ['main'],
    ]),
    // 宿曜 27宿
    P_shukuyou_xiu: pick(c.shukuyou, [
      ['xiu'],
      ['宿'],
      ['name'],
      ['main'],
    ]),
    // マヤ KIN
    Q_maya_kin: pick(c.maya, [
      ['kin'],
      ['KIN'],
      ['number'],
      ['main'],
    ]),
    // 姓名判断
    R_seimei_summary: pick(
      c.seimei,
      [['summary'], ['sansaiHaichi'], ['totalName'], ['totalKaku'], ['main']],
      120,
    ),
    // 動物キャラ
    S_animal_character: pick(c.animal, [
      ['character'],
      ['name'],
      ['main'],
      ['type'],
    ]),
    // ヒューマンデザイン風タイプ
    T_humanDesign_type: pick(c.humanDesign, [
      ['type'],
      ['main'],
      ['definition'],
    ]),
    // 算命学
    U_sanmei_summary: pick(
      c.sanmei,
      [['summary'], ['main'], ['youjin'], ['inJin'], ['youJin']],
      120,
    ),
    // 366日タイプ
    V_day366_type: pick(c.day366, [
      ['type'],
      ['name'],
      ['main'],
      ['title'],
    ]),
    // 春夏秋冬
    W_season_type: pick(c.season, [
      ['type'],
      ['season'],
      ['main'],
      ['name'],
    ]),
    // X: 12支配星 + 帝王学 + バイオリズム要約
    X_celestial_other: [
      pick(c.twelveStar, [['main'], ['name'], ['type']], 40),
      pick(c.teiou, [['main'], ['type'], ['name']], 40),
      pick(c.biorhythm, [['summary'], ['phase'], ['main']], 40),
    ]
      .filter(Boolean)
      .join(' / '),
  };
}

// ============================================================================
// 心理スコア → Y〜AE
// ============================================================================

export function formatScores(s: ScoresJson | null | undefined): {
  Y_big5: string;
  Z_derived16Type: string;
  AA_riasec: string;
  AB_vak: string;
  AC_enneagram_main: string;
  AD_attachment_main: string;
  AE_entrepreneur_main: string;
} {
  if (!s) {
    return {
      Y_big5: '',
      Z_derived16Type: '',
      AA_riasec: '',
      AB_vak: '',
      AC_enneagram_main: '',
      AD_attachment_main: '',
      AE_entrepreneur_main: '',
    };
  }

  // Big5: O=70, C=55, E=80, A=60, N=40 形式
  const big5 = s.big5
    ? `O=${fmtNum(s.big5.O)} C=${fmtNum(s.big5.C)} E=${fmtNum(s.big5.E)} A=${fmtNum(s.big5.A)} N=${fmtNum(s.big5.N)}`
    : '';

  // RIASEC: R=50 I=70 ...
  const riasec = s.riasec
    ? Object.entries(s.riasec)
        .map(([k, v]) => `${k}=${fmtNum(v)}`)
        .join(' ')
    : '';

  // VAK
  const vak = s.vak
    ? `V=${fmtNum(s.vak.V)} A=${fmtNum(s.vak.A)} K=${fmtNum(s.vak.K)}`
    : '';

  return {
    Y_big5: big5,
    Z_derived16Type: s.derived16Type ?? '',
    AA_riasec: riasec,
    AB_vak: vak,
    AC_enneagram_main: topKeyOf(s.enneagram),
    AD_attachment_main: topKeyOf(s.attachment),
    AE_entrepreneur_main: topKeyOf(s.entrepreneurType),
  };
}

function fmtNum(n: number | undefined | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Record<string, number> の最大値キーを返す */
function topKeyOf(rec: Record<string, number> | undefined | null): string {
  if (!rec) return '';
  let best: { key: string; v: number } | null = null;
  for (const [k, v] of Object.entries(rec)) {
    if (typeof v !== 'number' || Number.isNaN(v)) continue;
    if (!best || v > best.v) best = { key: k, v };
  }
  return best ? `${best.key} (${fmtNum(best.v)})` : '';
}

// ============================================================================
// ナラティブ → AF〜AN
// ============================================================================

const NARRATIVE_QID_TO_COL: Record<string, keyof DiagnosisSheetRow> = {
  n1: 'AF_n1_dream',
  n2: 'AG_n2_anger',
  n3: 'AH_n3_freework',
  n4: 'AI_n4_belief',
  n5: 'AJ_n5_strength',
  n6: 'AK_n6_future',
  n7: 'AL_n7_idol',
  style_sample: 'AM_styleSample',
  ng_expressions: 'AN_ngExpressions',
};

export function formatNarratives(rows: NarrativesRow[] | null | undefined): {
  AF_n1_dream: string;
  AG_n2_anger: string;
  AH_n3_freework: string;
  AI_n4_belief: string;
  AJ_n5_strength: string;
  AK_n6_future: string;
  AL_n7_idol: string;
  AM_styleSample: string;
  AN_ngExpressions: string;
} {
  const out = {
    AF_n1_dream: '',
    AG_n2_anger: '',
    AH_n3_freework: '',
    AI_n4_belief: '',
    AJ_n5_strength: '',
    AK_n6_future: '',
    AL_n7_idol: '',
    AM_styleSample: '',
    AN_ngExpressions: '',
  };

  if (!rows || rows.length === 0) return out;

  for (const r of rows) {
    const col = NARRATIVE_QID_TO_COL[r.q_id];
    if (col && col in out) {
      // セル文字列はスプシAPIの上限に注意 (50,000文字)。ここでは2,000で切る。
      (out as Record<string, string>)[col] = truncate(r.content ?? '', 2000);
    }
  }

  return out;
}

// ============================================================================
// 統合タグ (AO列)
// ============================================================================

export function formatTags(metadata: Json | null | undefined): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return '';
  const m = metadata as Record<string, Json | undefined>;
  const tags = m['tags'];
  if (Array.isArray(tags)) {
    return tags.map((t) => cellify(t as Json, 30)).filter(Boolean).join(' / ');
  }
  if (typeof tags === 'string') return tags;
  return '';
}
