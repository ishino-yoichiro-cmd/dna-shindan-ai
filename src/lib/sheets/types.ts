/**
 * DNA診断AI — Google Sheets 行構造の型
 *
 * 仕様書 docs/spec.md の「YOスプシ列構造」に対応。A〜AS の45列構成。
 * 命術16は主要キー10個程度に平坦化、心理スコアも軸ごとに展開。
 */

import type { RelationshipTag } from '../supabase/database.types';

// ============================================================================
// 行構造 (オブジェクト形式・編集しやすさ重視)
// ============================================================================

export interface DiagnosisSheetRow {
  // ---- 基本情報 (A〜H) ----
  A_timestamp: string;            // 完了日時 (ISO)
  B_userId: string;               // diagnosis.id
  C_fullName: string;
  D_email: string;
  E_relationshipTag: RelationshipTag | '';
  F_birthDate: string;            // YYYY-MM-DD
  G_birthTime: string;            // HH:MM
  H_birthPlace: string;

  // ---- 命術16診断結果 (I〜X) ----
  I_shichuu_dayPillar: string;       // 四柱日柱 (例: 甲子)
  J_kyusei_main: string;             // 九星本命 (例: 二黒土星)
  K_numerology_lifePath: string;     // 数秘ライフパス (例: 22)
  L_western_sun: string;             // 西洋占星 太陽サイン
  M_western_moon: string;            // 月サイン
  N_western_asc: string;             // ASC
  O_shibi_mainStar: string;          // 紫微斗数 主星
  P_shukuyou_xiu: string;            // 宿曜 27宿
  Q_maya_kin: string;                // マヤ KIN
  R_seimei_summary: string;          // 姓名判断 サマリ
  S_animal_character: string;        // 動物キャラ
  T_humanDesign_type: string;        // ヒューマンデザイン風タイプ
  U_sanmei_summary: string;          // 算命学 サマリ
  V_day366_type: string;             // 366日タイプ
  W_season_type: string;             // 春夏秋冬
  X_celestial_other: string;         // 12支配星 / 帝王学 / バイオリズム

  // ---- 心理診断スコア (Y〜AE) ----
  Y_big5: string;                    // O/C/E/A/N (5値カンマ)
  Z_derived16Type: string;           // 16タイプ性格 (MBTI回避命名)
  AA_riasec: string;                 // RIASEC 6軸
  AB_vak: string;                    // V/A/K
  AC_enneagram_main: string;         // エニア主タイプ
  AD_attachment_main: string;        // アタッチメント主スタイル
  AE_entrepreneur_main: string;      // 起業家メインタイプ

  // ---- ナラティブ (AF〜AN) ----
  AF_n1_dream: string;               // Q31 夢中体験
  AG_n2_anger: string;               // Q32 怒り
  AH_n3_freework: string;            // Q33 無償でもやる
  AI_n4_belief: string;              // Q34 譲れない信念
  AJ_n5_strength: string;            // Q35 褒められた強み
  AK_n6_future: string;              // Q36 5年後妄想
  AL_n7_idol: string;                // Q37 真似したい人物
  AM_styleSample: string;            // 文体サンプル
  AN_ngExpressions: string;          // NG表現

  // ---- メタ (AO〜AS) ----
  AO_tags: string;                   // 統合タグ (10キーワード)
  AP_pdfUrl: string;                 // PDFレポートURL
  AQ_cloneUrl: string;               // 分身ボットURL
  AR_emailOpened: string;            // 開封フラグ ('opened' / '')
  AS_lpSource: string;               // LP流入経路
}

// ============================================================================
// A〜AS の列順 (Sheets append 時の配列化に使う)
// ============================================================================

export const SHEET_COLUMN_ORDER: readonly (keyof DiagnosisSheetRow)[] = [
  'A_timestamp',
  'B_userId',
  'C_fullName',
  'D_email',
  'E_relationshipTag',
  'F_birthDate',
  'G_birthTime',
  'H_birthPlace',
  'I_shichuu_dayPillar',
  'J_kyusei_main',
  'K_numerology_lifePath',
  'L_western_sun',
  'M_western_moon',
  'N_western_asc',
  'O_shibi_mainStar',
  'P_shukuyou_xiu',
  'Q_maya_kin',
  'R_seimei_summary',
  'S_animal_character',
  'T_humanDesign_type',
  'U_sanmei_summary',
  'V_day366_type',
  'W_season_type',
  'X_celestial_other',
  'Y_big5',
  'Z_derived16Type',
  'AA_riasec',
  'AB_vak',
  'AC_enneagram_main',
  'AD_attachment_main',
  'AE_entrepreneur_main',
  'AF_n1_dream',
  'AG_n2_anger',
  'AH_n3_freework',
  'AI_n4_belief',
  'AJ_n5_strength',
  'AK_n6_future',
  'AL_n7_idol',
  'AM_styleSample',
  'AN_ngExpressions',
  'AO_tags',
  'AP_pdfUrl',
  'AQ_cloneUrl',
  'AR_emailOpened',
  'AS_lpSource',
] as const;

/** 期待される列数 (検証用) */
export const EXPECTED_COLUMN_COUNT = SHEET_COLUMN_ORDER.length;
