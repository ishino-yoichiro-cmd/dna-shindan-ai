#!/bin/bash
# deploy-prod.sh — E2E テスト通過後のみ本番デプロイを実行する物理ゲート
#
# 使い方: bash scripts/deploy-prod.sh
# UNSAFE_SKIP_DEPLOY_GUARD を廃止し、このスクリプトを唯一の本番デプロイ経路にする。
#
# 手順:
#   1. verify-auth-coverage.sh を実行
#   2. Playwright E2E を本番 URL に対して実行
#   3. 全 PASS の場合のみ vercel --prod を実行
#   4. デプロイ後 alias を確認・更新

set -euo pipefail

VERCEL=/Users/yo/.nvm/versions/node/v24.14.0/bin/vercel
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROD_URL="https://dna-shindan-ai.vercel.app"

echo "================================================================"
echo "🚀 DNA診断AI — 本番デプロイゲート"
echo "   $(date '+%Y-%m-%d %H:%M:%S JST')"
echo "================================================================"

# ── PHASE 1: 認証カバレッジ検査 ──────────────────
echo ""
echo "PHASE 1: API 認証カバレッジ検査"
bash "$PROJECT_DIR/scripts/verify-auth-coverage.sh" "$PROJECT_DIR"
echo "✅ PHASE 1 PASS"

# ── PHASE 2: 現在の本番 E2E テスト（デプロイ前に現行確認）──
echo ""
echo "PHASE 2: 現行本番 E2E テスト（$PROD_URL）"
cd "$PROJECT_DIR"

# Playwright がインストールされているか確認
if ! npx playwright --version &>/dev/null; then
  echo "⚠️  Playwright 未インストール。インストールします..."
  npm run test:e2e:install
fi

E2E_BASE_URL="$PROD_URL" npx playwright test --project=chromium-desktop 2>&1
E2E_EXIT=$?

if [ $E2E_EXIT -ne 0 ]; then
  echo ""
  echo "❌ PHASE 2 FAIL — E2E テストが失敗。デプロイを中止します。"
  echo "   詳細: npx playwright show-report で確認"
  exit 1
fi
echo "✅ PHASE 2 PASS"

# ── PHASE 3: デプロイ実行 ──────────────────────
echo ""
echo "PHASE 3: Vercel 本番デプロイ"
DEPLOY_OUTPUT=$("$VERCEL" --prod --yes 2>&1)
echo "$DEPLOY_OUTPUT"

# デプロイ URL を抽出
NEW_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://dna-shindan-[a-z0-9]+-yoisno-2007s-projects\.vercel\.app' | head -1)
if [ -z "$NEW_URL" ]; then
  echo "⚠️  デプロイURL取得失敗。alias確認をスキップします。"
else
  echo "✅ PHASE 3 PASS — $NEW_URL"

  # ── PHASE 4: alias 確認 ──────────────────────
  echo ""
  echo "PHASE 4: alias 確認"
  ALIAS_OUTPUT=$("$VERCEL" alias ls 2>&1)
  CURRENT_ALIAS=$(echo "$ALIAS_OUTPUT" | grep "dna\.kami-ai\.jp" | awk '{print $1}')

  echo "   dna.kami-ai.jp → $CURRENT_ALIAS"
  if [ "$CURRENT_ALIAS" != "$NEW_URL" ]; then
    echo "   ⚠️  alias が旧デプロイを向いています。更新します..."
    "$VERCEL" alias set "$NEW_URL" dna.kami-ai.jp
    echo "   ✅ alias 更新完了"
  else
    echo "   ✅ alias は最新デプロイを向いています"
  fi
fi

# ── PHASE 5: デプロイ後スモーク ──────────────
echo ""
echo "PHASE 5: デプロイ後スモークテスト"
sleep 5  # Vercel CDN 反映待ち

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/")
if [ "$HTTP_STATUS" != "200" ]; then
  echo "❌ PHASE 5 FAIL — HTTP $HTTP_STATUS (期待値: 200)"
  exit 1
fi
echo "✅ PHASE 5 PASS — HTTP 200"

echo ""
echo "================================================================"
echo "✅ デプロイ完了 — 全フェーズ PASS"
echo "   $PROD_URL"
echo "================================================================"
