-- ============================================================================
-- DNA診断AI — reports テーブルに text_content (jsonb) 追加
-- Migration: 00003_reports_text_content.sql
-- 目的：Claude Sonnet 4.6 統合エンジンが生成した13章テキストを保存する。
-- ============================================================================
-- 仕様参照: docs/spec.md (v3.3) Layer 4 統合エンジン
-- 既存 reports テーブル：PDF Storage パスのみを持っていた。
-- 本マイグレーションで「章別テキスト本体」を保存するカラムを追加し、
-- PDF生成前のテキストレイヤを永続化する。
-- ----------------------------------------------------------------------------

alter table public.reports
  add column if not exists text_content jsonb,
  add column if not exists integration_tags text[],
  add column if not exists model text,
  add column if not exists usage_input_tokens int,
  add column if not exists usage_output_tokens int,
  add column if not exists usage_cache_creation_tokens int,
  add column if not exists usage_cache_read_tokens int,
  add column if not exists cost_usd numeric(10, 6);

comment on column public.reports.text_content is
  '13章テキストJSON {chapters: {chapterId: {text, success, ...}}, totalUsage, ...}';
comment on column public.reports.integration_tags is
  '1章で抽出された統合タグ（10個程度）';
comment on column public.reports.model is
  '生成に使ったモデルID（例: claude-sonnet-4-6）';
comment on column public.reports.cost_usd is
  '本診断のLLM生成コスト合計（プロンプトキャッシュ適用後・USD）';

-- diagnoses_id 一意制約：1診断につき1レポート
create unique index if not exists uq_reports_diagnosis_id on public.reports(diagnosis_id);
