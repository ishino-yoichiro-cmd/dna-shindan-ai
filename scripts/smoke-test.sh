#!/usr/bin/env bash
# =============================================================================
# smoke-test.sh — 本番デプロイ後の即時動作確認
# =============================================================================
# 主要エンドポイントを叩いて 200/期待JSON を確認。失敗時 exit 1。
# 使用：bash scripts/smoke-test.sh [base_url]
#       既定 base_url=https://dna-shindan-ai.vercel.app
# =============================================================================

set -e

BASE_URL="${1:-https://dna-shindan-ai.vercel.app}"
FAIL=0
PASS=0

check() {
  local name="$1"
  local url="$2"
  local expected="$3"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 30)
  if [ "$code" = "$expected" ]; then
    echo "  ✅ $name → $code"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name → $code (expected $expected)"
    FAIL=$((FAIL+1))
  fi
}

check_post() {
  local name="$1"
  local url="$2"
  local body="$3"
  local expected="$4"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" -H "content-type: application/json" -d "$body" --max-time 30)
  if [ "$code" = "$expected" ]; then
    echo "  ✅ $name → $code"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name → $code (expected $expected)"
    FAIL=$((FAIL+1))
  fi
}

echo "=========================================="
echo "🛡  Smoke Test: $BASE_URL"
echo "=========================================="

echo ""
echo "▶ Public pages"
check "/"            "$BASE_URL/"            "200"
check "/diagnosis"   "$BASE_URL/diagnosis"   "200"
check "/admin"       "$BASE_URL/admin"       "200"
check "/match"       "$BASE_URL/match"       "200"

echo ""
echo "▶ Public API"
check "GET /api/submit"          "$BASE_URL/api/submit"          "200"
check "GET /api/process-pending" "$BASE_URL/api/process-pending" "200"
check "GET /api/questions"       "$BASE_URL/api/questions"       "200"

echo ""
echo "▶ Admin API"
check "/api/admin/stats?pass=yo-admin"     "$BASE_URL/api/admin/stats?pass=yo-admin"     "200"
check "/api/admin/stats (unauth)"          "$BASE_URL/api/admin/stats"                   "401"

echo ""
echo "▶ /api/score POST"
check_post "/api/score" "$BASE_URL/api/score" '{"answers":{"Q5":"A","Q6":"B"}}' "200"

echo ""
echo "▶ /api/celestial-preview POST"
check_post "/api/celestial-preview" "$BASE_URL/api/celestial-preview" '{"birthDate":"1985-05-15"}' "200"

echo ""
echo "▶ /api/empathy POST"
check_post "/api/empathy" "$BASE_URL/api/empathy" '{"questionId":"Q5","choiceId":"A"}' "200"

echo ""
echo "=========================================="
if [ "$FAIL" -gt 0 ]; then
  echo "❌ FAIL: $FAIL endpoint(s) returned unexpected status"
  echo "   PASS: $PASS"
  echo "=========================================="
  exit 1
fi
echo "✅ ALL PASS ($PASS endpoints)"
echo "=========================================="
exit 0
