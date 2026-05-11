/**
 * DNA診断AI — Supabase Database 型定義
 *
 * 対応マイグレーション:
 *   supabase/migrations/00001_initial_schema.sql
 *   supabase/migrations/00002_rls_policies.sql
 *
 * jsonb カラムは個別に強い型を当てるため、ユーティリティ型 (CelestialResultsJson 等) を併用する。
 */

// ============================================================================
// 共通型
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================================
// ENUM
// ============================================================================

export const RELATIONSHIP_TAGS = [
  'マブダチ',
  '友達',
  '旧友',
  'ビジネスパートナー',
  'クライアント',
  '企画参加者',
  '知り合い',
  'この診断で知った',
] as const;
export type RelationshipTag = (typeof RELATIONSHIP_TAGS)[number];

export const DIAGNOSIS_STATUSES = [
  'in_progress',
  'completed',
  'failed',
] as const;
export type DiagnosisStatus = (typeof DIAGNOSIS_STATUSES)[number];

// ============================================================================
// jsonb カラムの強い型 (アプリ層で利用)
// ============================================================================

/** 質問1問あたりの回答ペイロード */
export type AnswerValue = {
  /** 例: 数値スコア (1〜5) / 選択肢の値 */
  value: number | string | string[] | boolean;
  /** 表示ラベル (例: "とてもあてはまる") */
  label?: string;
  /** どの軸にどれだけ寄与したかのメタ (Big5 等) */
  contributes?: Record<string, number>;
};

/** 命術16診断の結果コンテナ */
export type CelestialResultsJson = {
  shichuu?: Json;            // 四柱推命
  shibi?: Json;              // 紫微斗数
  kyusei?: Json;             // 九星気学
  shukuyou?: Json;           // 宿曜
  maya?: Json;               // マヤ暦
  numerology?: Json;         // 数秘術
  western?: Json;            // 西洋占星術
  humanDesign?: Json;        // ヒューマンデザイン風
  seimei?: Json;             // 姓名判断
  sanmei?: Json;             // 算命学
  animal?: Json;             // 動物キャラ
  day366?: Json;             // 366日タイプ
  season?: Json;             // 春夏秋冬理論
  teiou?: Json;              // 帝王学
  twelveStar?: Json;         // 12支配星
  biorhythm?: Json;          // バイオリズム年間カレンダー
  computedAt?: string;
  durationsMs?: Record<string, number>;
};

/** 心理スコアコンテナ */
export type ScoresJson = {
  big5?: {
    O: number;  // Openness
    C: number;  // Conscientiousness
    E: number;  // Extraversion
    A: number;  // Agreeableness
    N: number;  // Neuroticism
  };
  derived16Type?: string;     // Big5から導出した16タイプ性格 (MBTI回避命名)
  enneagram?: Record<string, number>; // 9タイプスコア
  riasec?: {
    R: number; I: number; A: number; S: number; E: number; C: number;
  };
  vak?: { V: number; A: number; K: number };
  attachment?: Record<string, number>;
  loveLanguage?: Record<string, number>;
  entrepreneurType?: Record<string, number>;
};

// ============================================================================
// テーブル行・差分型
// ============================================================================

export type DiagnosesRow = {
  id: string;
  user_id: string | null;
  status: DiagnosisStatus;
  relationship_tag: RelationshipTag | null;
  email: string | null;
  full_name: string | null;
  family_name: string | null;
  given_name: string | null;
  birth_date: string | null;          // 'YYYY-MM-DD'
  birth_time: string | null;          // 'HH:MM:SS'
  birth_place_name: string | null;
  birth_place_lat: number | null;
  birth_place_lng: number | null;
  birth_place_tz: string | null;
  lp_source: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};
export type DiagnosesInsert = Partial<
  Omit<DiagnosesRow, 'id' | 'created_at' | 'updated_at'>
> & { status?: DiagnosisStatus };
export type DiagnosesUpdate = Partial<DiagnosesRow>;

export type ResponsesRow = {
  id: string;
  diagnosis_id: string;
  question_id: string;
  answer_value: AnswerValue;
  answered_at: string;
};
export type ResponsesInsert = Omit<ResponsesRow, 'id' | 'answered_at'> & {
  id?: string;
  answered_at?: string;
};
export type ResponsesUpdate = Partial<ResponsesRow>;

export type CelestialResultsRow = {
  id: string;
  diagnosis_id: string;
  results_json: CelestialResultsJson;
  computed_at: string;
};
export type CelestialResultsInsert = Omit<
  CelestialResultsRow,
  'id' | 'computed_at'
> & { id?: string; computed_at?: string };
export type CelestialResultsUpdate = Partial<CelestialResultsRow>;

export type ScoresRow = {
  id: string;
  diagnosis_id: string;
  scores_json: ScoresJson;
  computed_at: string;
};
export type ScoresInsert = Omit<ScoresRow, 'id' | 'computed_at'> & {
  id?: string;
  computed_at?: string;
};
export type ScoresUpdate = Partial<ScoresRow>;

export type NarrativesRow = {
  id: string;
  diagnosis_id: string;
  q_id: string;             // n1〜n7 / style_sample / ng_expressions
  content: string;
  written_at: string;
};
export type NarrativesInsert = Omit<NarrativesRow, 'id' | 'written_at'> & {
  id?: string;
  written_at?: string;
};
export type NarrativesUpdate = Partial<NarrativesRow>;

export type ReportsRow = {
  id: string;
  diagnosis_id: string;
  storage_path: string;
  public_url: string | null;
  page_count: number | null;
  generated_at: string;
};
export type ReportsInsert = Omit<
  ReportsRow,
  'id' | 'generated_at' | 'page_count' | 'public_url'
> & {
  id?: string;
  generated_at?: string;
  page_count?: number | null;
  public_url?: string | null;
};
export type ReportsUpdate = Partial<ReportsRow>;

export type ClonesRow = {
  id: string;
  diagnosis_id: string;
  system_prompt: string;
  public_url: string | null;
  chat_count: number;
  created_at: string;
  last_chatted_at: string | null;
};
export type ClonesInsert = Omit<
  ClonesRow,
  'id' | 'chat_count' | 'created_at'
> & {
  id?: string;
  chat_count?: number;
  created_at?: string;
};
export type ClonesUpdate = Partial<ClonesRow>;

export type EmpathyMessagesLogRow = {
  id: string;
  diagnosis_id: string;
  question_id: string;
  message: string;
  shown_at: string;
};
export type EmpathyMessagesLogInsert = Omit<
  EmpathyMessagesLogRow,
  'id' | 'shown_at'
> & { id?: string; shown_at?: string };
export type EmpathyMessagesLogUpdate = Partial<EmpathyMessagesLogRow>;

export type EmailLogsRow = {
  id: string;
  diagnosis_id: string;
  recipient: string;
  subject: string;
  body_preview: string | null;
  resend_id: string | null;
  sent_at: string;
  opened_at: string | null;
};
export type EmailLogsInsert = Omit<
  EmailLogsRow,
  'id' | 'sent_at' | 'opened_at' | 'body_preview' | 'resend_id'
> & {
  id?: string;
  sent_at?: string;
  opened_at?: string | null;
  body_preview?: string | null;
  resend_id?: string | null;
};
export type EmailLogsUpdate = Partial<EmailLogsRow>;

// ============================================================================
// supabase-js 用 Database 型 (createClient<Database>() の T)
// ============================================================================

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      diagnoses: {
        Row: DiagnosesRow;
        Insert: DiagnosesInsert;
        Update: DiagnosesUpdate;
        Relationships: [];
      };
      responses: {
        Row: ResponsesRow;
        Insert: ResponsesInsert;
        Update: ResponsesUpdate;
        Relationships: [
          {
            foreignKeyName: 'responses_diagnosis_id_fkey';
            columns: ['diagnosis_id'];
            isOneToOne: false;
            referencedRelation: 'diagnoses';
            referencedColumns: ['id'];
          },
        ];
      };
      celestial_results: {
        Row: CelestialResultsRow;
        Insert: CelestialResultsInsert;
        Update: CelestialResultsUpdate;
        Relationships: [
          {
            foreignKeyName: 'celestial_results_diagnosis_id_fkey';
            columns: ['diagnosis_id'];
            isOneToOne: false;
            referencedRelation: 'diagnoses';
            referencedColumns: ['id'];
          },
        ];
      };
      scores: {
        Row: ScoresRow;
        Insert: ScoresInsert;
        Update: ScoresUpdate;
        Relationships: [
          {
            foreignKeyName: 'scores_diagnosis_id_fkey';
            columns: ['diagnosis_id'];
            isOneToOne: false;
            referencedRelation: 'diagnoses';
            referencedColumns: ['id'];
          },
        ];
      };
      narratives: {
        Row: NarrativesRow;
        Insert: NarrativesInsert;
        Update: NarrativesUpdate;
        Relationships: [
          {
            foreignKeyName: 'narratives_diagnosis_id_fkey';
            columns: ['diagnosis_id'];
            isOneToOne: false;
            referencedRelation: 'diagnoses';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: ReportsRow;
        Insert: ReportsInsert;
        Update: ReportsUpdate;
        Relationships: [
          {
            foreignKeyName: 'reports_diagnosis_id_fkey';
            columns: ['diagnosis_id'];
            isOneToOne: false;
            referencedRelation: 'diagnoses';
            referencedColumns: ['id'];
          },
        ];
      };
      clones: {
        Row: ClonesRow;
        Insert: ClonesInsert;
        Update: ClonesUpdate;
        Relationships: [
          {
            foreignKeyName: 'clones_diagnosis_id_fkey';
            columns: ['diagnosis_id'];
            isOneToOne: false;
            referencedRelation: 'diagnoses';
            referencedColumns: ['id'];
          },
        ];
      };
      empathy_messages_log: {
        Row: EmpathyMessagesLogRow;
        Insert: EmpathyMessagesLogInsert;
        Update: EmpathyMessagesLogUpdate;
        Relationships: [
          {
            foreignKeyName: 'empathy_messages_log_diagnosis_id_fkey';
            columns: ['diagnosis_id'];
            isOneToOne: false;
            referencedRelation: 'diagnoses';
            referencedColumns: ['id'];
          },
        ];
      };
      email_logs: {
        Row: EmailLogsRow;
        Insert: EmailLogsInsert;
        Update: EmailLogsUpdate;
        Relationships: [
          {
            foreignKeyName: 'email_logs_diagnosis_id_fkey';
            columns: ['diagnosis_id'];
            isOneToOne: false;
            referencedRelation: 'diagnoses';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [K in never]: never };
    Functions: { [K in never]: never };
    Enums: {
      relationship_tag_enum: RelationshipTag;
      diagnosis_status_enum: DiagnosisStatus;
    };
    CompositeTypes: { [K in never]: never };
  };
};
