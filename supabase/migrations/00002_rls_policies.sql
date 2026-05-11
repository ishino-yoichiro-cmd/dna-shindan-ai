-- ============================================================================
-- DNA診断AI — Row Level Security ポリシー
-- Migration: 00002_rls_policies.sql
-- ----------------------------------------------------------------------------
-- 方針:
--   - service_role (バックエンド/管理者) : 全テーブル全操作許可
--   - anon (公開クライアント) : diagnoses INSERT のみ許可 (新規診断開始)
--   - 個別の読み取り・更新は後フェーズで diagnosis_id ベースの
--     トークン認証 + signed URL 設計で別途制御する
-- ============================================================================

-- すべてのテーブルで RLS を有効化
alter table public.diagnoses             enable row level security;
alter table public.responses             enable row level security;
alter table public.celestial_results     enable row level security;
alter table public.scores                enable row level security;
alter table public.narratives            enable row level security;
alter table public.reports               enable row level security;
alter table public.clones                enable row level security;
alter table public.empathy_messages_log  enable row level security;
alter table public.email_logs            enable row level security;

-- ============================================================================
-- service_role : 全テーブル全操作許可
-- ============================================================================
-- 注: service_role は通常 RLS をバイパスするが、明示的にポリシーを書いて
--     監査時の意図を明確化する。

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'diagnoses','responses','celestial_results','scores',
      'narratives','reports','clones','empathy_messages_log','email_logs'
    ])
  loop
    execute format(
      'drop policy if exists "service_role full access" on public.%I;', t
    );
    execute format(
      'create policy "service_role full access" on public.%I
         as permissive for all to service_role using (true) with check (true);',
      t
    );
  end loop;
end$$;

-- ============================================================================
-- anon : diagnoses への INSERT のみ許可 (新規診断開始)
-- ============================================================================
drop policy if exists "anon can insert diagnosis" on public.diagnoses;
create policy "anon can insert diagnosis"
  on public.diagnoses
  as permissive for insert
  to anon
  with check (true);

-- anon の SELECT/UPDATE/DELETE は許可しない (ポリシーを作らないことで拒否される)

-- ============================================================================
-- responses / narratives : anon は INSERT のみ許可
-- (回答送信時にクライアントから直接書き込めるよう許可。
--  ただし対象 diagnosis の存在検証はアプリ層 or Edge Function で行う。
--  読み取りは service_role 経由のみ)
-- ============================================================================
drop policy if exists "anon can insert response"  on public.responses;
create policy "anon can insert response"
  on public.responses
  as permissive for insert
  to anon
  with check (true);

drop policy if exists "anon can insert narrative" on public.narratives;
create policy "anon can insert narrative"
  on public.narratives
  as permissive for insert
  to anon
  with check (true);

-- ============================================================================
-- empathy_messages_log : anon は INSERT のみ許可 (毎問後ログ)
-- ============================================================================
drop policy if exists "anon can insert empathy log" on public.empathy_messages_log;
create policy "anon can insert empathy log"
  on public.empathy_messages_log
  as permissive for insert
  to anon
  with check (true);

-- ============================================================================
-- celestial_results / scores / reports / clones / email_logs :
--   anon は一切アクセス不可 (バックエンド経由のみ)
-- ============================================================================
-- ポリシーを作らない = anon に対しては全拒否
-- service_role は上記ループで許可済み
