# Runbook — __PRODUCT_NAME__

> 障害発生時の手順書。Google SRE Production Readiness Review 準拠。
> リリース前に必ず作成。月次でリハーサル更新。

---

## 1. プロダクト概要

- **URL**: __FILL_ME__
- **GitHub**: __FILL_ME__
- **Vercel Project**: __FILL_ME__
- **Supabase Project ID**: __FILL_ME__
- **想定 SLO**: 可用性 99.5% / p95 レイテンシ 1.5s 以下

## 2. 主要依存

| サービス | 役割 | ダッシュボード | 連絡先 |
|---|---|---|---|
| Vercel | ホスティング | https://vercel.com/dashboard | support@vercel.com |
| Supabase | DB | https://supabase.com/dashboard | support@supabase.com |
| Resend / Gmail SMTP | メール送信 | __ | __ |
| __ADD__ | __ | __ | __ |

## 3. 監視

- Vercel Logs: __URL__
- Supabase Logs: __URL__
- Sentry Dashboard: __URL__（後続Phaseで統合）
- 死活監視 (UptimeRobot 等): __URL__

## 4. 緊急時連絡先

- **YO**: yoisno@gmail.com
- **オンコール**: __FILL_ME__

## 5. インシデント対応プレイブック

### P1（全停止・データ漏洩）

1. **検知**: 監視 alert 受領 / ユーザー報告
2. **緊急ロールバック**:
   - Vercel: dashboard → Deployments → 直前緑 deployment → "Promote to Production"
   - Supabase: 必要なら point-in-time recovery
3. **影響範囲確認**: 影響ユーザー数・期間・データ範囲
4. **告知**: ステータスページ・メール通知
5. **事後**: postmortem 24h 以内（テンプレ：`incident_log.md`）

### P2（一部機能停止）

1. 影響範囲特定 → feature flag で部分停止
2. 修正 → preview deploy で検証 → promote
3. 24h 以内に postmortem

### P3（軽微・性能劣化）

1. ログ分析 → 翌営業日対応

## 6. よくあるトラブルと初動

| 症状 | 一次切り分け | 対処 |
|---|---|---|
| 5xx 多発 | Vercel deployment ログ | 直前 deployment にロールバック |
| DB connection error | Supabase status / connection pool | Pooler 経由に切替・connection 解放 |
| メール届かない | SMTP/Resend ログ | スパム判定・SPF/DKIM 確認 |
| LLM 応答遅延 | Anthropic status | retry / モデル切替（Haiku） |

## 7. データバックアップ

- **DB**: Supabase 自動 daily backup（Pro 以上は PITR）
- **Storage**: __FILL_ME__
- **復旧 RTO**: 1h / **RPO**: 24h

## 8. 変更管理

- 本番デプロイは git push origin main → pre-push hook (`verify-deploy-ready.sh`) PASS 必須
- DB スキーマ変更は preview branch で先行 → migration → 本番
- feature flag 使用時はフラグ操作ログを残す

## 9. ポストモーテム テンプレ

```
## Incident <ID>

- 発生日時:
- 検知日時:
- 復旧日時:
- 影響範囲:
- 原因:
- 対処:
- 再発防止:
- アクションアイテム:
```

`/Users/yo/secretary/claude-team/_shared/incident_log.md` に追記。
