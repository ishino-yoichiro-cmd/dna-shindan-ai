# TOTAL_STEPS 変更チェックリスト

`TOTAL_STEPS` または 33問仕様の構成（多軸選択18問・ナラティブ8問・プロフィール4問・style/finalize 3問）に変更を入れる際の同期項目一覧。

**過去の教訓**：30問 → 33問 移行（2026-05-04〜05-05）時、`STORAGE_KEY` のバンプ漏れにより旧仕様の localStorage が読み込まれて Step 31-33 で routing 崩壊。`MILESTONE_STEPS` / `EVOLUTION_STEPS` の不整合で「画面真っ白＋進行不能」事故も発生。**1ファイルでも漏らすと診断フロー全断**。

---

## 同期が必要なファイル一覧（13箇所）

### コア定数（src/lib/store/types.ts）

| 項目 | 行 | 用途 | 変更時の注意 |
|---|---|---|---|
| `TOTAL_STEPS` | 77 | 全体ステップ総数 | 変更すると ProgressBar / MilestoneScreen / reducer / DiagnosisProvider 全てに伝播 |
| `SELECT_STEP_QIDS` | 80-83 | 多軸選択 18問の QID リスト | 件数を変える場合は `stepToQuestionId` の range（5-22）と CHAPTERS の `select-*` も連動 |
| `NARRATIVE_STEP_QIDS` | 86 | 自由記述 Q31〜Q38 | 件数を変える場合は `stepToQuestionId` の range（23-30）、process-pending の Q31..Q38 マッピング、celestial-context のラベル定義、admin 詳細の表記も連動 |
| `CHAPTERS` | 88-96 | 章構造（from-to range） | 各 `from` / `to` が SELECT/NARRATIVE/style/finalize の境界と一致しないと getCurrentChapter が壊れる |
| `stepToQuestionId` | 103-109 | step → QID の変換関数 | range（5-22 / 23-30）を SELECT / NARRATIVE 件数に同期 |
| `STORAGE_KEY` | 115 | localStorage キー | **必ずバンプ**（例：`session-v3` → `session-v4`）。バンプ忘れると旧仕様の保存値で routing 崩壊 |
| `STORAGE_KEY_LEGACY` | 116 | 旧キー一覧（cleanup 対象） | バンプ時に旧キーを追加して、ユーザーの localStorage を 1 回だけ自動 purge |

### コンポーネント側のステップ参照

| ファイル | 行 | 項目 | 同期方針 |
|---|---|---|---|
| `components/diagnosis/DiagnosisFlow.tsx` | 24 | `MILESTONE_STEPS = new Set([10, 15, 23])` | 全体ステップが変わるとマイルストーン位置も再設計 |
| `components/diagnosis/CloneEvolution.tsx` | 13 | `EVOLUTION_STEPS_ARRAY = [22, 30] as const` | TS の `Record<EvolutionStep, ...>` 制約で PHASES と同期強制済（追加時に PHASES エントリ追加し忘れると TS error） |
| `components/diagnosis/CloneEvolution.tsx` | 17-36 | `PHASES` Record | EVOLUTION_STEPS_ARRAY の各値に対応する phase / pct / lines を必ず用意 |
| `components/diagnosis/MilestoneScreen.tsx` | 4-45 | TOTAL_STEPS を import して `remaining` / `percent` 計算 | 自動連動（変更不要） |
| `components/diagnosis/ProgressBar.tsx` | 3-26 | TOTAL_STEPS を import | 自動連動 |

### バックエンド・PDF章生成

| ファイル | 行 | 項目 | 同期方針 |
|---|---|---|---|
| `app/api/process-pending/route.ts` | 169-176 | `narrative: { Q31..Q38 }` のマッピング | NARRATIVE_STEP_QIDS の件数・キー名と完全一致させる |
| `lib/llm/prompts/celestial-context.ts` | 263-272 | Q31..Q38 のラベル定義 `[{ key, label }]` | 件数・キー名・人間可読ラベルを更新 |
| `lib/llm/types.ts` | 78 | `Q38?: string` 等の型 | NARRATIVE_STEP_QIDS と完全一致 |
| `lib/clone/system-prompt-builder.ts` | 各所 | 分身AI system prompt の Q参照 | Q番号変更時に参照を更新（現状 Q31-Q35 のみ参照） |

### admin / UI 表記

| ファイル | 行 | 項目 | 同期方針 |
|---|---|---|---|
| `app/admin/page.tsx` | 1040 | 「本人の自由記述（Q31〜Q37）」表記 | NARRATIVE_STEP_QIDS の範囲と表記を一致させる（現状 Q38 が抜けているバグあり） |

### DB スキーマ

| 対象 | 同期方針 |
|---|---|
| `dna_diagnoses.narrative_answers`（JSONB） | キー名（Q31..Q38 等）を変更する場合、既存レコードのマイグレーションが必要。後方互換読み出しを当面残すか、一斉 UPDATE を打つ |

---

## 変更時の作業手順（必ずこの順序で）

1. **どの部分を変えるか確定**（TOTAL_STEPS 数 / SELECT 件数 / NARRATIVE 件数 / CHAPTERS / マイルストーン位置）
2. 上の一覧を上から順に grep して**全該当箇所を一度に書き換える**（部分変更だと localStorage / routing で必ず事故る）
3. **STORAGE_KEY を必ずバンプ**（数字を1つ進める）し、旧キーを STORAGE_KEY_LEGACY に追加
4. `npm run build` で TypeScript エラーをまず潰す（`Record<EvolutionStep, ...>` 等の網羅性違反はここで検出される）
5. `npm run test` または invariants test で既存契約が壊れていないか確認
6. ローカルで実機 33問通し（または新step数）：診断スタート → 全問回答 → 完了画面 → admin で記録確認
7. **process-pending を実機叩いて PDF 章生成も検証**（narrative マッピング漏れはここまで来ないと発覚しない）
8. デプロイ前に `verify-deploy-ready.sh` を必ず通す

---

## 過去事故の記録（再発防止用）

- **2026-05-04 → 05-05 朝**：40問 → 30問 → 33問 と 2 回変更。STORAGE_KEY が v1 → v2 → v3 と 2 回バンプ。旧 v1 を引きずったユーザーで Step 31-33 routing 崩壊。**教訓：STORAGE_KEY のバンプは必須・絶対**
- **2026-05-05 朝**：MILESTONE_STEPS / EVOLUTION_STEPS の値変更時、対応する `PHASES` Record の更新を忘れて「画面真っ白＋進行不能」発生。**教訓：CloneEvolution.tsx は TS の `Record<EvolutionStep,…>` 制約で型エラー強制済（2026-05-06 修正）**。MILESTONE_STEPS には現状そのような型ガード無し → 変更時は MilestoneScreen.tsx の switch も確認

---

## 関連ファイル

- `src/lib/store/types.ts` — 全定数の単一情報源
- `src/components/diagnosis/CloneEvolution.tsx:12` — PHASES 同期コメント
- `src/app/api/process-pending/route.ts:169-176` — narrative マッピング
- `src/lib/llm/prompts/celestial-context.ts:263-272` — PDF プロンプト Q ラベル
