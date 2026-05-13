#!/bin/bash
# verify-env-integrity.sh
# Vercel本番envを取得し、危険な末尾文字・空値を検出する

set -euo pipefail
cd "$(dirname "$0")/.."

echo "=== ENV変数整合性チェック ==="
TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

vercel env pull --environment=production --yes "$TMPFILE" 2>/dev/null

ERRORS=0

# 必須キーの存在チェック
REQUIRED_KEYS=(
  "NEXT_PUBLIC_SITE_URL"
  "NEXT_PUBLIC_SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "ANTHROPIC_API_KEY"
  "GMAIL_USER"
  "GMAIL_APP_PASSWORD"
  "CRON_SECRET"
  "ADMIN_PASSWORD"
  "ANTHROPIC_BUDGET_USD"
)

for key in "${REQUIRED_KEYS[@]}"; do
  val=$(grep "^${key}=" "$TMPFILE" | sed 's/^[^=]*=//' | tr -d '"' || echo "")
  if [[ -z "$val" ]]; then
    echo "❌ MISSING: $key"
    ERRORS=$((ERRORS+1))
    continue
  fi
  # 末尾改行・スペース検出
  raw=$(grep "^${key}=" "$TMPFILE" | sed 's/^[^=]*=//' | tr -d '"')
  if echo "$raw" | grep -qP '\n|\r|\s+$' 2>/dev/null || [[ "$raw" != "${raw%$'\n'}" ]] || [[ "$raw" != "${raw%$'\r'}" ]]; then
    echo "❌ TRAILING WHITESPACE/NEWLINE: $key"
    ERRORS=$((ERRORS+1))
  else
    echo "✅ OK: $key"
  fi
done

# NEXT_PUBLIC_SITE_URL がhttpsで始まりスラッシュで終わっていないことを確認
SITE_URL=$(grep "^NEXT_PUBLIC_SITE_URL=" "$TMPFILE" | sed 's/^[^=]*=//' | tr -d '"' | tr -d '\n' | tr -d '\r' | xargs)
if [[ ! "$SITE_URL" =~ ^https:// ]]; then
  echo "❌ SITE_URL がhttpsで始まっていない: '$SITE_URL'"
  ERRORS=$((ERRORS+1))
fi
if [[ "$SITE_URL" =~ /$ ]]; then
  echo "❌ SITE_URL が末尾スラッシュで終わっている: '$SITE_URL'"
  ERRORS=$((ERRORS+1))
fi
echo "   NEXT_PUBLIC_SITE_URL = '$SITE_URL'"

echo ""
if [[ $ERRORS -gt 0 ]]; then
  echo "❌ ENV整合性チェック FAIL ($ERRORS件のエラー)"
  exit 1
else
  echo "✅ ENV整合性チェック PASS"
fi
