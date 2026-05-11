-- ============================================================================
-- DNA診断AI — 初期スキーマ
-- Migration: 00001_initial_schema.sql
-- PostgreSQL 15 互換 / Supabase
-- ============================================================================
-- 仕様書: /Users/yo/secretary/dna-shindan-ai/docs/spec.md (v3.3)
-- スプシ列構造 A〜AS と対応するデータパイプラインの DB 側定義。
-- ----------------------------------------------------------------------------

-- 拡張 -------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "uuid-ossp";  -- 互換用

-- ============================================================================
-- ENUM 型
-- ============================================================================

-- YOとの関係性タグ（仕様書 UI/UX 設計より）
do $$
begin
  if not exists (select 1 from pg_type where typname = 'relationship_tag_enum') then
    create type relationship_tag_enum as enum (
      'マブダチ',
      '友達',
      '旧友',
      'ビジネスパートナー',
      'クライアント',
      '企画参加者',
      '知り合い',
      'この診断で知った'
    );
  end if;
end$$;

-- 診断ステータス
do $$
begin
  if not exists (select 1 from pg_type where typname = 'diagnosis_status_enum') then
    create type diagnosis_status_enum as enum (
      'in_progress',
      'completed',
      'failed'
    );
  end if;
end$$;

-- ============================================================================
-- 1. diagnoses : 診断セッション本体
-- ============================================================================
-- スプシ列 A,B,C,D,E,F,G,H,AS と対応
create table if not exists public.diagnoses (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid,                                          -- 将来の認証連携用 (NULL可)
  status              diagnosis_status_enum not null default 'in_progress',
  relationship_tag    relationship_tag_enum,                         -- スプシE列
  email               text,                                          -- スプシD列
  full_name           text,                                          -- スプシC列 (姓+名)
  family_name         text,                                          -- 姓
  given_name          text,                                          -- 名
  birth_date          date,                                          -- スプシF列
  birth_time          time,                                          -- スプシG列 (任意)
  birth_place_name    text,                                          -- スプシH列 (例: "東京都新宿区")
  birth_place_lat     numeric(9,6),                                  -- 緯度
  birth_place_lng     numeric(9,6),                                  -- 経度
  birth_place_tz      text,                                          -- 例: "Asia/Tokyo"
  lp_source           text,                                          -- スプシAS列 (LP流入経路)
  metadata            jsonb not null default '{}'::jsonb,            -- 拡張用
  created_at          timestamptz not null default now(),            -- スプシA列
  updated_at          timestamptz not null default now(),
  completed_at        timestamptz
);

comment on table  public.diagnoses is 'DNA診断AI 診断セッション本体';
comment on column public.diagnoses.relationship_tag is 'YOとの関係性タグ (スプシE列)';
comment on column public.diagnoses.lp_source is 'LP流入経路 (スプシAS列)';

-- ============================================================================
-- 2. responses : 質問回答 (40問の選択式回答および記述式の構造データ)
-- ============================================================================
create table if not exists public.responses (
  id              uuid primary key default gen_random_uuid(),
  diagnosis_id    uuid not null references public.diagnoses(id) on delete cascade,
  question_id     text not null,                                     -- 例: "q05", "ocean_07"
  answer_value    jsonb not null,                                    -- {value:3,label:"あてはまる"} 等
  answered_at     timestamptz not null default now()
);

comment on table public.responses is '質問40問の回答 (選択式・スコア式の生データ)';

-- 同一診断内で同一question_idを上書き可能に: ユニーク制約は付けず、最新answered_atで判定する設計

-- ============================================================================
-- 3. celestial_results : 命術16診断結果
-- ============================================================================
-- スプシI列〜X列に対応 (16診断分)
create table if not exists public.celestial_results (
  id              uuid primary key default gen_random_uuid(),
  diagnosis_id    uuid not null references public.diagnoses(id) on delete cascade,
  results_json    jsonb not null,                                    -- 16診断の全結果を構造化
  computed_at     timestamptz not null default now()
);

comment on table public.celestial_results is '命術16診断のJSON結果 (四柱・紫微・九星・宿曜・マヤ・数秘・西洋・HD・姓名・算命・動物・366・春夏秋冬・帝王・12支配星・バイオリズム)';

-- ============================================================================
-- 4. scores : 心理診断スコア
-- ============================================================================
-- スプシY列〜AE列に対応
create table if not exists public.scores (
  id              uuid primary key default gen_random_uuid(),
  diagnosis_id    uuid not null references public.diagnoses(id) on delete cascade,
  scores_json     jsonb not null,                                    -- big5/エニア/RIASEC/VAK/愛着/愛情/起業家タイプ
  computed_at     timestamptz not null default now()
);

comment on table public.scores is '心理診断スコア (Big5/エニア/RIASEC/VAK/愛着/愛情表現/起業家)';

-- ============================================================================
-- 5. narratives : ナラティブ7問の記述全文
-- ============================================================================
-- スプシAF列〜AL列 (7問) に対応 + 文体サンプル(AM)・NG表現(AN) も同テーブルで保持
create table if not exists public.narratives (
  id              uuid primary key default gen_random_uuid(),
  diagnosis_id    uuid not null references public.diagnoses(id) on delete cascade,
  q_id            text not null,                                     -- "n1"〜"n7" / "style_sample" / "ng_expressions"
  content         text not null,                                     -- 記述全文
  written_at      timestamptz not null default now()
);

comment on table public.narratives is 'ナラティブ7問+文体サンプル+NG表現の記述全文';

-- ============================================================================
-- 6. reports : 生成PDFレポート
-- ============================================================================
-- スプシAP列に対応
create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  diagnosis_id    uuid not null references public.diagnoses(id) on delete cascade,
  storage_path    text not null,                                     -- Supabase Storage上のパス (reports/{diagnosis_id}.pdf)
  public_url      text,                                              -- 公開URL (生成されれば)
  page_count      int,                                               -- ページ数 (約30)
  generated_at    timestamptz not null default now()
);

comment on table public.reports is '生成PDFレポート (Supabase Storage参照)';

-- ============================================================================
-- 7. clones : 分身AIボット
-- ============================================================================
-- スプシAQ列に対応
create table if not exists public.clones (
  id              uuid primary key default gen_random_uuid(),
  diagnosis_id    uuid not null references public.diagnoses(id) on delete cascade,
  system_prompt   text not null,                                     -- Claude送信用システムプロンプト全文
  public_url      text,                                              -- /clone/[id] の公開URL
  chat_count      int not null default 0,                            -- 会話回数カウンタ
  created_at      timestamptz not null default now(),
  last_chatted_at timestamptz
);

comment on table public.clones is '分身AIボット (Claude プロンプト型・個別URL発行)';

-- ============================================================================
-- 8. empathy_messages_log : 共感メッセージ表示ログ
-- ============================================================================
-- 没入設計4「毎問後フィードバック」の表示記録 (品質改善・コスト追跡用)
create table if not exists public.empathy_messages_log (
  id              uuid primary key default gen_random_uuid(),
  diagnosis_id    uuid not null references public.diagnoses(id) on delete cascade,
  question_id     text not null,
  message         text not null,
  shown_at        timestamptz not null default now()
);

comment on table public.empathy_messages_log is '共感メッセージ表示ログ (動的生成 or テンプレ表示の記録)';

-- ============================================================================
-- 9. email_logs : メール送信ログ
-- ============================================================================
-- スプシAR列(開封フラグ) に対応
create table if not exists public.email_logs (
  id              uuid primary key default gen_random_uuid(),
  diagnosis_id    uuid not null references public.diagnoses(id) on delete cascade,
  recipient       text not null,
  subject         text not null,
  body_preview    text,
  resend_id       text,                                              -- Resend の message id
  sent_at         timestamptz not null default now(),
  opened_at       timestamptz                                        -- スプシAR列
);

comment on table public.email_logs is 'Resend経由の送信ログ＋開封フラグ';

-- ============================================================================
-- インデックス
-- ============================================================================
create index if not exists idx_diagnoses_email             on public.diagnoses(email);
create index if not exists idx_diagnoses_relationship_tag  on public.diagnoses(relationship_tag);
create index if not exists idx_diagnoses_status            on public.diagnoses(status);
create index if not exists idx_diagnoses_created_at        on public.diagnoses(created_at desc);

create index if not exists idx_responses_diagnosis_id      on public.responses(diagnosis_id);
create index if not exists idx_responses_question_id       on public.responses(diagnosis_id, question_id);

create index if not exists idx_celestial_diagnosis_id      on public.celestial_results(diagnosis_id);
create index if not exists idx_scores_diagnosis_id         on public.scores(diagnosis_id);
create index if not exists idx_narratives_diagnosis_id     on public.narratives(diagnosis_id);
create index if not exists idx_reports_diagnosis_id        on public.reports(diagnosis_id);
create index if not exists idx_clones_diagnosis_id         on public.clones(diagnosis_id);
create index if not exists idx_empathy_diagnosis_id        on public.empathy_messages_log(diagnosis_id);
create index if not exists idx_email_logs_diagnosis_id     on public.email_logs(diagnosis_id);

-- ============================================================================
-- updated_at 自動更新トリガ (diagnoses のみ)
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_diagnoses_set_updated_at on public.diagnoses;
create trigger trg_diagnoses_set_updated_at
  before update on public.diagnoses
  for each row execute function public.set_updated_at();
