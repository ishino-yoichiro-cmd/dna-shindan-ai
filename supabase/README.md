# DNA診断AI — Supabase セットアップ手順

このディレクトリは DNA診断AI 用の Supabase スキーマとマイグレーションを管理する。
**実DBへの適用は YO 手動前提**（Phase 2-E では SQL ファイル書き出しまでが範囲）。

---

## 1. 前提

- Supabase プロジェクトを別途作成しておく（既存の本番DBとは**別プロジェクト**を強く推奨）
- プロジェクトURL / anon key / service role key を取得しておく
- Storage バケット `reports`（public）を後述の通り作成する

---

## 2. マイグレーション適用手順（Supabase Studio SQL Editor）

### 2-1. 初期スキーマ

1. [Supabase Studio](https://supabase.com/dashboard) にログインし、対象プロジェクトを開く
2. 左サイドバー「SQL Editor」→「New query」
3. [`migrations/00001_initial_schema.sql`](./migrations/00001_initial_schema.sql) の内容を全文コピペ
4. 右上の「Run」を実行
5. 「Success. No rows returned.」が出ればOK

### 2-2. RLSポリシー

1. 同じく SQL Editor で「New query」
2. [`migrations/00002_rls_policies.sql`](./migrations/00002_rls_policies.sql) を全文コピペ
3. 「Run」を実行
4. 全テーブルで RLS が有効になり、必要最小限のポリシーが付与される

### 2-3. Storage バケット作成

SQL Editor で以下を実行：

```sql
insert into storage.buckets (id, name, public)
  values ('reports', 'reports', true)
  on conflict (id) do nothing;
```

または Studio の「Storage」→「New bucket」から `reports` を public で作成。

### 2-4. 動作確認

- 「Table Editor」で 9テーブルが見えること
- 「Authentication → Policies」で各テーブルにポリシーが付いていること
- 「Storage」に `reports` バケットがあること

---

## 3. テーブル一覧と目的

| # | テーブル | 用途 | スプシ列対応 |
|---|---|---|---|
| 1 | `diagnoses` | 診断セッション本体（氏名・生年月日・関係性タグ等） | A,B,C,D,E,F,G,H,AS |
| 2 | `responses` | 質問40問の選択式・スコア式回答（jsonb） | (集約後 Y-AE 算出元) |
| 3 | `celestial_results` | 命術16診断のJSON結果 | I-X |
| 4 | `scores` | 心理診断スコア（Big5/エニア/RIASEC/VAK等） | Y-AE |
| 5 | `narratives` | ナラティブ7問+文体サンプル+NG表現の記述全文 | AF-AN |
| 6 | `reports` | 生成PDFレポートのStoragePath/公開URL | AP |
| 7 | `clones` | 分身AIボットのsystem_prompt/公開URL/会話数 | AQ |
| 8 | `empathy_messages_log` | 共感メッセージ表示ログ | （内部用） |
| 9 | `email_logs` | Resend送信ログ＋開封フラグ | AR |

加えて統合タグ（AO列）は将来 `diagnoses.metadata.tags` に格納予定。

---

## 4. スプシ集約フローとの紐付け（仕様書 AS列までの対応関係）

仕様書 [`docs/spec.md`](../../../docs/spec.md) の「YOスプシ列構造」と DB の対応：

| スプシ列 | 内容 | DBソース |
|---|---|---|
| A | タイムスタンプ | `diagnoses.created_at` |
| B | ユーザーID | `diagnoses.id` |
| C | 氏名 | `diagnoses.full_name` |
| D | メール | `diagnoses.email` |
| E | YOとの関係性タグ | `diagnoses.relationship_tag` |
| F | 生年月日 | `diagnoses.birth_date` |
| G | 生まれ時刻 | `diagnoses.birth_time` |
| H | 出生地 | `diagnoses.birth_place_name` |
| I-X | 命術16診断結果 | `celestial_results.results_json` の各キー |
| Y-AE | 心理診断スコア | `scores.scores_json` の各キー |
| AF-AL | ナラティブ7問の回答全文 | `narratives.content` (q_id=n1〜n7) |
| AM | 文体サンプル300字 | `narratives.content` (q_id=style_sample) |
| AN | NG表現 | `narratives.content` (q_id=ng_expressions) |
| AO | 統合タグ（AI生成キーワード10個） | `diagnoses.metadata->>'tags'`（後フェーズで実装） |
| AP | PDFレポートURL | `reports.public_url` |
| AQ | 分身ボットURL | `clones.public_url` |
| AR | メール開封フラグ | `email_logs.opened_at` の有無 |
| AS | LP流入経路 | `diagnoses.lp_source` |

スプシ集約は Edge Function (Phase 2 後半) で `diagnoses.completed_at` をトリガに行う。

---

## 5. 環境変数

[`/Users/yo/secretary/dna-shindan-ai/app/.env.example`](file:///Users/yo/secretary/dna-shindan-ai/app/.env.example) を参照。
ローカルでは `.env.local` を作成、本番は Vercel の Environment Variables に同一キーを設定する。

---

## 6. RLS設計の方針

| ロール | 操作 | 対象 |
|---|---|---|
| `service_role` | 全操作 | 全テーブル |
| `anon` | INSERT のみ | `diagnoses` / `responses` / `narratives` / `empathy_messages_log` |
| `anon` | アクセス不可 | `celestial_results` / `scores` / `reports` / `clones` / `email_logs` |

ユーザー個別の読み取りは、後フェーズで Edge Function を介した
**diagnosis_id ベースの一回性トークン認証 + signed URL** で別途制御する設計。
本フェーズではフロントから直接 SELECT することはしない。

---

## 7. ロールバック

開発中の破壊的やり直し用：

```sql
-- 全テーブル＆ENUM削除（注意：本番では絶対に実行しない）
drop table if exists public.email_logs cascade;
drop table if exists public.empathy_messages_log cascade;
drop table if exists public.clones cascade;
drop table if exists public.reports cascade;
drop table if exists public.narratives cascade;
drop table if exists public.scores cascade;
drop table if exists public.celestial_results cascade;
drop table if exists public.responses cascade;
drop table if exists public.diagnoses cascade;
drop type  if exists relationship_tag_enum;
drop type  if exists diagnosis_status_enum;
drop function if exists public.set_updated_at();
```

---

## 8. 既知のTODO

- [ ] Storage バケット作成 SQL を `00003_storage_buckets.sql` として独立migration化
- [ ] `diagnoses.metadata.tags`（統合タグ AO列）の jsonb 構造定義
- [ ] diagnosis_id ベースの一回性トークン認証スキーマ（`access_tokens` テーブル）
- [ ] Edge Function：スプシ集約・PDF生成・メール送信
- [ ] バックアップ運用（Supabase 有料プランへ移行時に検討）
- [ ] 旧字体→康熙画数辞書テーブル（必要なら別 migration）
