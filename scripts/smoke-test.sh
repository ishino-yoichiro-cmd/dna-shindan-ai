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
check "GET /api/questions"       "$BASE_URL/api/questions"       "200"
check "GET /api/submit (no body→400)"  "$BASE_URL/api/submit"   "400"
check "GET /api/process-pending (no auth→401)" "$BASE_URL/api/process-pending" "401"

echo ""
echo "▶ Admin API"
check "/api/admin/stats (Bearer auth)" "$BASE_URL/api/admin/stats" "401"  # Bearer必須

echo ""
echo "▶ PDF ダウンロード E2E（最重要）"
# 直近のcompleted+pdf_storage_pathありユーザーをadmin APIから取得してDLテスト
ADMIN_PASS="${ADMIN_PASSWORD:-dna-admin-2026}"
STATS=$(curl -s -H "Authorization: Bearer ${ADMIN_PASS}" "${BASE_URL}/api/admin/stats" --max-time 30 || echo "")
PDF_TARGET=$(echo "$STATS" | python3 -c "
import sys, json
try:
  data = json.load(sys.stdin)
  rows = [r for r in data.get('rows', []) if r.get('pdf_storage_path') and r.get('status') == 'completed' and r.get('access_token')]
  print(rows[0]['id'] + ':' + rows[0]['access_token']) if rows else print('')
except: print('')
" 2>/dev/null || echo "")

if [[ -n "$PDF_TARGET" ]]; then
  PDF_ID="${PDF_TARGET%%:*}"
  PDF_TOKEN="${PDF_TARGET##*:}"
  # token認証でのPDFダウンロード
  PDF_CODE=$(curl -s -o /tmp/smoke-pdf -w "%{http_code}" "${BASE_URL}/api/me/${PDF_ID}/pdf?token=${PDF_TOKEN}" --max-time 30)
  PDF_CT=$(file /tmp/smoke-pdf 2>/dev/null | grep -i "PDF" || echo "")
  if [[ "$PDF_CODE" == "200" ]] && [[ -n "$PDF_CT" ]]; then
    echo "  ✅ PDF DL (token) → 200 PDF確認"
    PASS=$((PASS+1))
  else
    echo "  ❌ PDF DL (token) → $PDF_CODE (200 PDFであるべき)"
    FAIL=$((FAIL+1))
  fi
  # 空passwordで401確認
  EMPTY_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/me/${PDF_ID}/pdf?password=" --max-time 10)
  if [[ "$EMPTY_CODE" == "401" ]]; then
    echo "  ✅ PDF DL (空pw) → 401"
    PASS=$((PASS+1))
  else
    echo "  ❌ PDF DL (空pw) → $EMPTY_CODE (401であるべき)"
    FAIL=$((FAIL+1))
  fi
else
  echo "  ⚠️  PDF DLテスト: 対象レコードなし（スキップ）"
fi

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
