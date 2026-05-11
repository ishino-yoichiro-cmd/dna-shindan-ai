#!/bin/bash
# DNA診断AI — Post-Deploy Smoke Tests
# post-deploy-smoke.sh から自動呼び出される。
# このファイルが存在するプロジェクトは全 API エンドポイントを実機検証してからデプロイ完了とみなす。
#
# 必要 env（deploy-and-verify.sh が自動注入）:
#   PROD_URL     本番URL (例: https://dna-shindan-ai.vercel.app)
#   ADMIN_PASS   管理画面パスワード（ADMIN_PASSWORD env var から取得）
#   CRON_SECRET  cron 認証トークン
#
# Exit: 0=PASS / 1=FAIL
set -euo pipefail

PROD_URL="${PROD_URL:?PROD_URL が未設定}"
ADMIN_PASS="${ADMIN_PASS:-}"
CRON_SECRET="${CRON_SECRET:-}"
EXIT_CODE=0
declare -a FAILS

_ok()   { echo "  ✅ $1"; }
_fail() { echo "  ❌ $1"; FAILS+=("$1"); EXIT_CODE=1; }
_skip() { echo "  ⏭  $1 (env未設定)"; }

echo ""
echo "━━━ DNA診断AI 固有 Smoke Tests ━━━"

# ─────────────────────────────────────────
# [A] 公開ページ HTTP 200/307
# ─────────────────────────────────────────
echo ""
echo "▶ [A] ページ疎通"
for ENDPOINT in "/" "/diagnosis" "/diagnosis/result"; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$PROD_URL$ENDPOINT" || echo "000")
  case "$HTTP" in
    2*|3*) _ok "$ENDPOINT → HTTP $HTTP" ;;
    *)     _fail "$ENDPOINT → HTTP $HTTP (期待: 2xx/3xx)" ;;
  esac
done

# ─────────────────────────────────────────
# [B] /api/submit — 入力バリデーション
# ─────────────────────────────────────────
echo ""
echo "▶ [B] /api/submit バリデーション"

# 生年月日なし → 400
RES=$(curl -s -w "\n%{http_code}" -X POST "$PROD_URL/api/submit" \
  -H "Content-Type: application/json" \
  -d '{"userInfo":{"firstName":"テスト"}}' --max-time 15 || echo -e "\n000")
HTTP=$(echo "$RES" | tail -1)
ERR=$(echo "$RES" | head -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error','?'))" 2>/dev/null || echo "?")
[ "$HTTP" = "400" ] && [ "$ERR" = "birth_date_required" ] \
  && _ok "birthDate未入力 → 400 birth_date_required" \
  || _fail "birthDate未入力 → HTTP $HTTP / error=$ERR (期待: 400 birth_date_required)"

# 不正メール → 400
RES=$(curl -s -w "\n%{http_code}" -X POST "$PROD_URL/api/submit" \
  -H "Content-Type: application/json" \
  -d '{"userInfo":{"birthDate":"1990-01-01","email":"not-an-email"}}' --max-time 15 || echo -e "\n000")
HTTP=$(echo "$RES" | tail -1)
ERR=$(echo "$RES" | head -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error','?'))" 2>/dev/null || echo "?")
[ "$HTTP" = "400" ] && [ "$ERR" = "invalid_email" ] \
  && _ok "不正メール → 400 invalid_email" \
  || _fail "不正メール → HTTP $HTTP / error=$ERR (期待: 400 invalid_email)"

# ─────────────────────────────────────────
# [C] 管理画面認証
# ─────────────────────────────────────────
echo ""
echo "▶ [C] 管理画面認証 (/api/admin/stats)"
if [ -z "$ADMIN_PASS" ]; then
  _fail "ADMIN_PASS 未設定 → 認証テスト不能（env ADMIN_PASS を設定してください）"
else
  # 正しいPW → 200
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    "$PROD_URL/api/admin/stats?pass=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$ADMIN_PASS'))")" \
    --max-time 15 || echo "000")
  [ "$HTTP" = "200" ] && _ok "正しいPW → 200" || _fail "正しいPW → HTTP $HTTP (期待: 200)"

  # 誤PW → 401
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    "$PROD_URL/api/admin/stats?pass=wrongpassword_smoke_test" --max-time 15 || echo "000")
  [ "$HTTP" = "401" ] && _ok "誤PW → 401" || _fail "誤PW → HTTP $HTTP (期待: 401)"

  # PW無し → 401
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" \
    "$PROD_URL/api/admin/stats" --max-time 15 || echo "000")
  [ "$HTTP" = "401" ] && _ok "PW無し → 401" || _fail "PW無し → HTTP $HTTP (期待: 401)"
fi

# ─────────────────────────────────────────
# [D] process-pending CRON認証
# ─────────────────────────────────────────
echo ""
echo "▶ [D] process-pending CRON認証"
if [ -z "$CRON_SECRET" ]; then
  _fail "CRON_SECRET 未設定 → 認証テスト不能（env CRON_SECRET を設定してください）"
else
  # POST: 正しいBearer → 200
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROD_URL/api/process-pending" \
    -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
    --max-time 30 || echo "000")
  [ "$HTTP" = "200" ] && _ok "POST 正しいBearer → 200" || _fail "POST 正しいBearer → HTTP $HTTP (期待: 200)"

  # ★ GET: Vercel Cronは GET で呼ぶ → GET でも処理が動くことを必ず確認 ★
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/process-pending" \
    -H "Authorization: Bearer $CRON_SECRET" \
    --max-time 30 || echo "000")
  [ "$HTTP" = "200" ] && _ok "GET 正しいBearer → 200 (Vercel Cron互換)" || _fail "GET 正しいBearer → HTTP $HTTP (期待: 200) ← Vercel Cronが動かない"

  # 誤Bearer → 401
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROD_URL/api/process-pending" \
    -H "Authorization: Bearer wrong_smoke_test" \
    --max-time 15 || echo "000")
  [ "$HTTP" = "401" ] && _ok "誤Bearer → 401" || _fail "誤Bearer → HTTP $HTTP (期待: 401)"

  # 認証無し → 401
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/process-pending" \
    --max-time 15 || echo "000")
  [ "$HTTP" = "401" ] && _ok "認証無し(GET) → 401" || _fail "認証無し(GET) → HTTP $HTTP (期待: 401)"
fi

# ─────────────────────────────────────────
# [E] retry-failed CRON認証
# ─────────────────────────────────────────
echo ""
echo "▶ [E] retry-failed CRON認証"
if [ -z "$CRON_SECRET" ]; then
  _skip "CRON_SECRET 未設定"
else
  # ★ GET: Vercel Cronは GET で呼ぶ → GET でも処理が動くことを必ず確認 ★
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/retry-failed" \
    -H "Authorization: Bearer $CRON_SECRET" --max-time 15 || echo "000")
  [ "$HTTP" = "200" ] && _ok "GET 正しいBearer → 200 (Vercel Cron互換)" || _fail "GET 正しいBearer → HTTP $HTTP (期待: 200)"

  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PROD_URL/api/retry-failed" \
    -H "Authorization: Bearer $CRON_SECRET" --max-time 15 || echo "000")
  [ "$HTTP" = "200" ] && _ok "POST 正しいBearer → 200" || _fail "POST 正しいBearer → HTTP $HTTP (期待: 200)"

  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/api/retry-failed" \
    --max-time 15 || echo "000")
  [ "$HTTP" = "401" ] && _ok "認証無し(GET) → 401" || _fail "認証無し(GET) → HTTP $HTTP (期待: 401)"
fi

# ─────────────────────────────────────────
# [F] E2E ハッピーパス（ユーザー目線・最重要）
# 「申し込んだらメールが届く」を実機で通す。
# これが通らない限り smoke tests は PASS にならない。
# ─────────────────────────────────────────
echo ""
echo "▶ [F] E2E ハッピーパス（申込→処理→完了）"

# 事前: completed 件数を記録
BEFORE_COMPLETED=$(curl -s "$PROD_URL/api/admin/stats?pass=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$ADMIN_PASS'))")" --max-time 10 \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('statusBreakdown',{}).get('completed',0))" 2>/dev/null || echo "ERR")

if [ "$BEFORE_COMPLETED" = "ERR" ] || [ -z "$ADMIN_PASS" ]; then
  _fail "E2E前確認失敗（admin/stats取得不能 or ADMIN_PASS未設定）"
else
  # テスト申請を送信（メールはタイムスタンプ付きでレート制限を回避）
  E2E_TS=$(date +%s)
  E2E_EMAIL="yoisno+e2e${E2E_TS}@gmail.com"
  SUBMIT_RES=$(curl -s -X POST "$PROD_URL/api/submit" \
    -H "Content-Type: application/json" \
    -d "{\"userInfo\":{\"firstName\":\"E2Eテスト\",\"lastName\":\"スモーク\",\"birthDate\":\"1990-01-01\",\"email\":\"${E2E_EMAIL}\",\"gender\":\"male\"},\"answers\":{},\"narrativeAnswers\":{}}" \
    --max-time 15 || echo '{}')
  SUBMIT_OK=$(echo "$SUBMIT_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ok','false'))" 2>/dev/null || echo "false")
  DIAG_ID=$(echo "$SUBMIT_RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('diagnosisId',''))" 2>/dev/null || echo "")

  if [ "$SUBMIT_OK" != "True" ] && [ "$SUBMIT_OK" != "true" ]; then
    _fail "E2E submit失敗: $SUBMIT_RES"
  else
    _ok "申込送信 → ok:true / diagnosisId=$DIAG_ID"

    # cronが処理するまで最大120秒ポーリング（5秒間隔）
    E2E_PASS=0
    for i in $(seq 1 24); do
      sleep 5
      AFTER_COMPLETED=$(curl -s "$PROD_URL/api/admin/stats?pass=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$ADMIN_PASS'))")" --max-time 10 \
        | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('statusBreakdown',{}).get('completed',0))" 2>/dev/null || echo "0")
      if [ "$AFTER_COMPLETED" -gt "$BEFORE_COMPLETED" ] 2>/dev/null; then
        E2E_PASS=1
        break
      fi
    done

    if [ "$E2E_PASS" = "1" ]; then
      _ok "申込→処理→completed 到達（${i}回目ポーリング / 最大120秒）"
      _ok "yoisno@gmail.com にレポートメールが送信されたことをDeployerが目視確認せよ"
    else
      _fail "E2E: 120秒以内にcompletedに遷移しなかった（cronが動いていない可能性）"
    fi
  fi
fi

# ─────────────────────────────────────────
# 結果サマリ
# ─────────────────────────────────────────
echo ""
if [ ${#FAILS[@]} -eq 0 ]; then
  echo "  ✅ 全 DNA診断AI smoke tests PASS"
  exit 0
fi

echo "  ❌ FAIL 項目:"
for f in "${FAILS[@]}"; do echo "    - $f"; done
exit 1
