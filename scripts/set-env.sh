#!/usr/bin/env bash
# =============================================================================
# set-env.sh — Vercel 環境変数変更の唯一の経路（CLI強制）
# =============================================================================
# 使い方:
#   bash scripts/set-env.sh KEY VALUE [production|preview|development]
#
# 例:
#   bash scripts/set-env.sh NEXT_PUBLIC_SITE_URL https://dna.kami-ai.jp production
#   bash scripts/set-env.sh ANTHROPIC_API_KEY sk-ant-xxx production
#
# なぜこれを使うか:
#   Vercel Dashboard から手動編集すると改行（\n）が混入するリスクがある。
#   2026-05-13 障害の直接原因は NEXT_PUBLIC_SITE_URL への \n 混入だった。
#   このスクリプト経由なら trim 済みの値が送られることを保証する。
#   設定後は verify-env-integrity.sh で即時検証する。
# =============================================================================

set -euo pipefail

KEY="${1:-}"
VALUE="${2:-}"
ENV="${3:-production}"

if [[ -z "$KEY" || -z "$VALUE" ]]; then
  echo "使い方: bash scripts/set-env.sh KEY VALUE [production|preview|development]"
  echo "例:     bash scripts/set-env.sh NEXT_PUBLIC_SITE_URL https://dna.kami-ai.jp production"
  exit 1
fi

# trim（前後の空白・改行を除去）
VALUE="${VALUE#"${VALUE%%[![:space:]]*}"}"
VALUE="${VALUE%"${VALUE##*[![:space:]]}"}"

echo "================================================================"
echo "🔧 Vercel env 変更 (CLI経由)"
echo "   KEY:   $KEY"
echo "   VALUE: $VALUE"
echo "   ENV:   $ENV"
echo "================================================================"

# Vercel CLI の存在確認
if ! command -v vercel &> /dev/null; then
  echo "❌ vercel CLI が見つかりません"
  echo "   npm i -g vercel でインストールしてください"
  exit 1
fi

# ログイン確認
if ! vercel whoami &>/dev/null; then
  echo "❌ Vercel にログインしていません: vercel login を実行してください"
  exit 1
fi

# 既存の値を削除（エラーは無視）
echo "  既存値を削除中..."
echo "" | vercel env rm "$KEY" "$ENV" --yes 2>/dev/null || true

# 新しい値を設定（echo でパイプして改行混入を防ぐ）
echo "  新しい値を設定中..."
printf '%s' "$VALUE" | vercel env add "$KEY" "$ENV"

echo ""
echo "✅ 設定完了"
echo ""
echo "  整合性チェックを実行中..."
if bash "$(dirname "${BASH_SOURCE[0]}")/verify-env-integrity.sh"; then
  echo "✅ verify-env-integrity PASS — 設定は正常です"
else
  echo "❌ verify-env-integrity FAIL — 設定に問題がある可能性があります"
  echo "   Vercel Dashboard で確認してください"
  exit 1
fi

echo ""
echo "================================================================"
echo "⚠️  次のデプロイ時に新しい値が反映されます。"
echo "   今すぐ反映: bash scripts/deploy-prod.sh"
echo "================================================================"
