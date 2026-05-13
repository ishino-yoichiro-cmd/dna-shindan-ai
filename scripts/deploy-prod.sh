#!/bin/bash
# deploy-prod.sh — git push origin main を唯一のデプロイ経路とする物理ゲート
#
# 使い方: bash scripts/deploy-prod.sh（または npm run deploy:prod）
#
# 経路: git push → pre-push hook(E2E) → GitHub Actions(E2E) → Branch Protection → Vercel自動デプロイ
# vercel --prod の直叩きは廃止。全デプロイをGitHub Branch Protection経由に統一。

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROD_URL="https://dna-shindan-ai.vercel.app"

echo "================================================================"
echo "🚀 DNA診断AI — 本番デプロイ（git push経由）"
echo "   $(date '+%Y-%m-%d %H:%M:%S JST')"
echo "================================================================"

cd "$PROJECT_DIR"

# ── Vercel env整合性チェック（2026-05-13障害の教訓：\n混入を事前検知） ──
echo ""
echo "PHASE 0: Vercel env整合性チェック"
if bash scripts/verify-env-integrity.sh; then
  echo "✅ env整合性 PASS"
else
  echo "❌ env整合性チェック FAIL — デプロイを中止します"
  echo "   Vercel Dashboardでenv変数を確認してください"
  echo "   https://vercel.com/dashboard → dna-shindan-ai → Settings → Environment Variables"
  exit 1
fi

# ── 未コミット変更チェック ──────────────────────
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo ""
  echo "❌ 未コミットの変更があります。先に commit してください。"
  echo "   git add -A && git commit -m 'your message'"
  exit 1
fi

# ── git push（pre-push hookでE2E自動実行） ────
echo ""
echo "PHASE 1: git push origin main"
echo "   → pre-push hook が E2E全33ステップを自動実行"
echo "   → GitHub Branch Protection が Playwright E2E PASS を要求"
echo "   → PASS後のみ Vercel が自動デプロイ"
echo ""

git push origin main 2>&1
PUSH_EXIT=$?

if [ $PUSH_EXIT -ne 0 ]; then
  echo ""
  echo "❌ PUSH FAIL — E2Eテスト失敗またはBranch Protectionによりブロック"
  echo "   詳細: npx playwright show-report"
  exit 1
fi

echo ""
echo "✅ push完了 — GitHub ActionsでE2E確認後、Vercelが自動デプロイします"
echo "   GitHub Actions: https://github.com/ishino-yoichiro-cmd/dna-shindan-ai/actions"
echo "   本番URL: $PROD_URL"
echo ""
echo "================================================================"
echo "  ⚠️  デプロイ完了後、以下のコマンドでPDF DLを必ず手動確認してください:"
echo "  bash scripts/verify-pdf-download.sh https://dna.kami-ai.jp"
echo "================================================================"
echo "✅ デプロイパイプライン起動完了"
echo "================================================================"
