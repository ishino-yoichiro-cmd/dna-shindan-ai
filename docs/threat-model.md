# Threat Model — STRIDE 分析

> プロダクト名: __FILL_ME__
> 対象範囲: __FILL_ME__
> 作成者: __FILL_ME__
> 作成日: __YYYY-MM-DD__

新規プロダクト着手前・大型機能追加前に必ず記入。`new-product-bootstrap.sh` で自動配置。

---

## 1. システム概観（Data Flow Diagram）

| 要素 | 信頼境界 | 入出力 |
|---|---|---|
| エンドユーザー Browser | 外部（信頼ゼロ） | HTTPS |
| Next.js (Vercel) | 半信頼 | 公開API・SSR |
| Supabase Postgres | 内部 | RLS適用済 |
| Anthropic API | 外部（業者） | Bearer auth |
| __ADD__ | __ADD__ | __ADD__ |

---

## 2. STRIDE 脅威識別

| カテゴリ | 想定脅威 | 影響 | 既存緩和 | 追加対策 | 担当 |
|---|---|---|---|---|---|
| **S**poofing（なりすまし） | 他ユーザーセッション乗取り | 高 | Supabase JWT・httpOnly cookie | session rotation・MFA検討 | __ |
| **T**ampering（改ざん） | クライアント側 payload 改竄 | 中 | Zod 検証・RLS | CSRF token | __ |
| **R**epudiation（否認） | 操作ログ無し | 中 | Supabase audit trigger | 監査テーブル必須化 | __ |
| **I**nformation Disclosure | RLS バグ・SERVICE_ROLE 漏洩 | 高 | verify-deploy Phase 3 | RLS 強制有効テスト | __ |
| **D**enial of Service | API 過剰リクエスト | 中 | Vercel 既定 throttle | rate limit middleware | __ |
| **E**levation of Privilege | role エスカレ | 高 | RLS auth.uid() 照合 | role 列を JWT に持たない | __ |

---

## 3. 個人情報・機密データ取り扱い

| データ種別 | 保管場所 | 暗号化 | 保持期間 | 削除導線 |
|---|---|---|---|---|
| 氏名・メール | Supabase | at rest（標準） | 24ヶ月 | /api/me/delete |
| 認証 token | httpOnly cookie | TLS in transit | session | sign out |
| __ADD__ | __ADD__ | __ADD__ | __ADD__ | __ADD__ |

**個情法・GDPR 適用判断**:
- 利用目的通知の有無: __
- 第三者提供の有無: __
- 越境移転の有無: __

---

## 4. 受入基準（DoD）

新機能リリース前に以下を満たすこと：

- [ ] 全 API ルートに `auth.uid()` 検証
- [ ] 全 input に Zod スキーマ
- [ ] 出力に PII redaction（log/エラー文言）
- [ ] verify-deploy-ready.sh PASS
- [ ] Playwright smoke PASS
- [ ] 個情法 該当時：privacy policy 更新済
- [ ] runbook 更新済
