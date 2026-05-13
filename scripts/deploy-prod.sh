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
echo "✅ push完了 — Vercelが自動デプロイ中..."
echo "   GitHub Actions: https://github.com/ishino-yoichiro-cmd/dna-shindan-ai/actions"
echo "   本番URL: $PROD_URL"
echo ""

# ── Vercelエイリアス自動更新（30秒待機後） ────────────────────────────────
# Vercelは新デプロイをproductionとして作成するが、vanity alias を自動更新しない場合がある
echo "PHASE 2: Vercelエイリアス自動更新（30秒待機）"
sleep 30

VERCEL_AUTH_FILE="$HOME/Library/Application Support/com.vercel.cli/auth.json"
if [ ! -f "$VERCEL_AUTH_FILE" ]; then
  VERCEL_AUTH_FILE="$HOME/.vercel/auth.json"
fi

if command -v python3 &>/dev/null && [ -f "$VERCEL_AUTH_FILE" ]; then
  VERCEL_TOKEN=$(python3 -c "import json; print(json.load(open('$VERCEL_AUTH_FILE'))['token'])" 2>/dev/null)
  TEAM_ID="team_cBetQzQ1UHMgWPglqEVxpCcr"
  VANITY_DOMAIN="dna-shindan-ai.vercel.app"

  if [ -n "$VERCEL_TOKEN" ]; then
    # 最新productionデプロイのUID取得
    NEW_DEPLOY=$(python3 -c "
import json, urllib.request
req = urllib.request.Request(
  'https://api.vercel.com/v6/deployments?teamId=$TEAM_ID&limit=10&target=production',
  headers={'Authorization': 'Bearer $VERCEL_TOKEN'}
)
data = json.loads(urllib.request.urlopen(req).read())
for d in data.get('deployments', []):
    if 'dna-shindan' in d.get('url','') and d.get('state') == 'READY':
        print(d['uid'])
        break
" 2>/dev/null)

    if [ -n "$NEW_DEPLOY" ]; then
      ALIAS_RESULT=$(python3 -c "
import json, urllib.request
req = urllib.request.Request(
  'https://api.vercel.com/v2/deployments/$NEW_DEPLOY/aliases?teamId=$TEAM_ID',
  data=json.dumps({'alias': '$VANITY_DOMAIN'}).encode(),
  headers={'Authorization': 'Bearer $VERCEL_TOKEN', 'Content-Type': 'application/json'},
  method='POST'
)
try:
    data = json.loads(urllib.request.urlopen(req).read())
    print('ok' if 'alias' in data else data.get('error',{}).get('code','fail'))
except Exception as e:
    print('error:', e)
" 2>/dev/null)
      if [ "$ALIAS_RESULT" = "ok" ]; then
        echo "  ✅ $VANITY_DOMAIN → $NEW_DEPLOY に更新完了"
      else
        echo "  ⚠️  エイリアス自動更新: $ALIAS_RESULT（手動確認: vercel alias ls | grep dna-shindan）"
      fi
    else
      echo "  ⚠️  新デプロイが見つかりません（Vercel自動デプロイ完了前の可能性）"
    fi
  fi
else
  echo "  ⏭  Vercelトークン未検出 — エイリアス手動確認が必要な場合があります"
fi

echo ""
echo "================================================================"
echo "  ⚠️  デプロイ完了後、以下のコマンドでPDF DLを必ず手動確認してください:"
echo "  bash scripts/verify-pdf-download.sh https://dna.kami-ai.jp"
echo "================================================================"
echo "✅ デプロイパイプライン起動完了"
echo "================================================================"
