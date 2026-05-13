#!/bin/bash
# verify-pdf-download.sh
# 本番でPDFダウンロードフローが実際に動くか確認する
# 使い方: bash scripts/verify-pdf-download.sh [SITE_URL]
# デプロイ後・復旧後に必ず実行すること

set -euo pipefail

SITE_URL="${1:-https://dna.kami-ai.jp}"
ADMIN_PASS="${ADMIN_PASSWORD:-dna-admin-2026}"
ERRORS=0

echo "=== PDF DLフロー E2Eスモークテスト ==="
echo "対象: $SITE_URL"
echo ""

# 1) 最新のcompleted＋pdf_storage_pathあり レコードをadmin APIから取得
echo "▶ Step1: 検証対象ユーザー取得..."
STATS=$(curl -s -H "Authorization: Bearer ${ADMIN_PASS}" "${SITE_URL}/api/admin/stats")
TARGET_ID=$(echo "$STATS" | python3 -c "
import sys, json
data = json.load(sys.stdin)
rows = [r for r in data.get('rows', []) if r.get('pdf_storage_path') and r.get('status') == 'completed' and r.get('access_token')]
if not rows:
    print('')
else:
    print(rows[0]['id'] + ':' + rows[0]['access_token'])
" 2>/dev/null || echo "")

if [[ -z "$TARGET_ID" ]]; then
  echo "⚠️  検証対象レコードなし（completedかつpdf_storage_pathあり）— スキップ"
  exit 0
fi

ID="${TARGET_ID%%:*}"
TOKEN="${TARGET_ID##*:}"
echo "   対象ID: $ID"

# 2) auth エンドポイント（token認証）
echo "▶ Step2: token認証..."
AUTH_RES=$(curl -s -X POST "${SITE_URL}/api/me/${ID}/auth" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"${TOKEN}\"}")
HAS_PDF=$(echo "$AUTH_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('hasPdf',''))" 2>/dev/null || echo "")
AUTH_OK=$(echo "$AUTH_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ok',''))" 2>/dev/null || echo "")

if [[ "$AUTH_OK" != "True" ]]; then
  echo "❌ token認証失敗: $AUTH_RES"
  ERRORS=$((ERRORS+1))
else
  echo "✅ token認証OK (hasPdf=$HAS_PDF)"
fi

# 3) PDFダウンロード（token経由）
echo "▶ Step3: PDFダウンロード（token）..."
HTTP_CODE=$(curl -s -o /tmp/test-pdf-output -w "%{http_code}" \
  "${SITE_URL}/api/me/${ID}/pdf?token=${TOKEN}")
CONTENT_TYPE=$(curl -s -I "${SITE_URL}/api/me/${ID}/pdf?token=${TOKEN}" 2>/dev/null | grep -i "content-type" | tr -d '\r' | awk '{print $2}' || echo "")

if [[ "$HTTP_CODE" == "200" ]] && [[ "$CONTENT_TYPE" == *"application/pdf"* ]]; then
  PDF_SIZE=$(wc -c < /tmp/test-pdf-output)
  echo "✅ PDFダウンロードOK (HTTP $HTTP_CODE, ${PDF_SIZE}バイト)"
else
  echo "❌ PDFダウンロード失敗: HTTP $HTTP_CODE, Content-Type=$CONTENT_TYPE"
  ERRORS=$((ERRORS+1))
fi

# 4) 空passwordでのDL → 必ず401
echo "▶ Step4: 空password → 401確認..."
HTTP_CODE_EMPTY=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SITE_URL}/api/me/${ID}/pdf?password=")
if [[ "$HTTP_CODE_EMPTY" == "401" ]]; then
  echo "✅ 空password → 401 (期待通り)"
else
  echo "❌ 空password → $HTTP_CODE_EMPTY (401であるべき)"
  ERRORS=$((ERRORS+1))
fi

# 5) 不正tokenでのDL → 必ず401
echo "▶ Step5: 不正token → 401確認..."
HTTP_CODE_BAD=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SITE_URL}/api/me/${ID}/pdf?token=invalid-token-xxx")
if [[ "$HTTP_CODE_BAD" == "401" ]]; then
  echo "✅ 不正token → 401 (期待通り)"
else
  echo "❌ 不正token → $HTTP_CODE_BAD (401であるべき)"
  ERRORS=$((ERRORS+1))
fi

echo ""
if [[ $ERRORS -gt 0 ]]; then
  echo "❌ PDF DL E2E FAIL ($ERRORS件)"
  exit 1
else
  echo "✅ PDF DL E2E PASS — 全ステップ正常"
fi
