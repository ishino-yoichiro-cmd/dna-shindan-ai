#!/bin/bash
# verify-auth-coverage.sh
# 全 API route.ts の認証カバレッジを機械的にチェックする。
#
# ルール：
#   全エンドポイントは以下のいずれかでなければならない:
#   1. SEALED   — 410 Gone を返す（廃止済み）
#   2. PUBLIC   — .claude/public-endpoints.txt に明示登録済みの公開API
#   3. AUTHED   — 認証パターンがコード内に存在する
#
#   3つのいずれでもない場合 → EXIT 1（ビルド停止）
#
# Usage: bash scripts/verify-auth-coverage.sh [project_dir]
# Exit:  0=全PASS / 1=未認証エンドポイントあり

set -euo pipefail

PROJECT_DIR="${1:-.}"
API_DIR="$PROJECT_DIR/src/app/api"
PUBLIC_LIST="$PROJECT_DIR/.claude/public-endpoints.txt"
FAIL_COUNT=0
declare -a FAILS

echo "================================================================"
echo "🔐 API 認証カバレッジ検査"
echo "   API DIR: $API_DIR"
echo "================================================================"

# 公開エンドポイントリストを読み込む（なければ空）
declare -a PUBLIC_ENDPOINTS=()
if [ -f "$PUBLIC_LIST" ]; then
  while IFS= read -r line; do
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    PUBLIC_ENDPOINTS+=("$line")
  done < "$PUBLIC_LIST"
fi

check_route() {
  local file="$1"
  local rel="${file#$API_DIR}"   # /admin/stats/route.ts など

  # ── SEALED チェック（410 を返すだけのファイル）──
  if grep -qE "status: 410|{ status: 410 }" "$file" 2>/dev/null; then
    echo "  🔒 SEALED  $rel"
    return
  fi

  # ── PUBLIC リスト照合 ──
  local dir
  dir=$(dirname "$rel")   # /admin/stats
  for pub in "${PUBLIC_ENDPOINTS[@]}"; do
    if [[ "$dir" == "$pub" || "$rel" == "$pub" ]]; then
      echo "  🌐 PUBLIC  $rel  (登録済)"
      return
    fi
  done

  # ── 認証パターン検索 ──
  # verifyCronSecret / access_token比較 / password_hash / ADMIN_PASSWORD / ADMIN_KEY /
  # authorization header / bcrypt / Basic認証 / Supabase service role（DB検証）
  if grep -qE \
    "(verifyCronSecret|access_token.*===|===.*access_token|password_hash|ADMIN_PASSWORD|ADMIN_KEY|authorization.*Bearer|Bearer.*authorization|bcrypt\.compare|authHeader|checkAdminAuth|getSupabaseServiceRoleClient|diagnosisId.*from.*diagnoses|nominatim\.openstreetmap\.org)" \
    "$file" 2>/dev/null; then
    echo "  ✅ AUTHED  $rel"
    return
  fi

  # ── 判定不能 → FAIL ──
  echo "  ❌ UNPROTECTED: $rel"
  echo "     → 認証なし・公開リスト未登録・410未設定"
  echo "     → 対処: .claude/public-endpoints.txt に追記 OR 認証を実装"
  FAILS+=("$rel")
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

# 全 route.ts を走査
while IFS= read -r -d '' route; do
  check_route "$route"
done < <(find "$API_DIR" -name "route.ts" -print0 2>/dev/null | sort -z)

echo ""
echo "================================================================"
if [ "$FAIL_COUNT" -eq 0 ]; then
  echo "✅ 認証カバレッジ検査 PASS — 全エンドポイント保護済み"
  exit 0
fi

echo "❌ 認証カバレッジ検査 FAIL — $FAIL_COUNT 件の未保護エンドポイント"
for f in "${FAILS[@]}"; do
  echo "   - $f"
done
echo ""
echo "修正方法:"
echo "  A) 公開APIとして意図している場合: .claude/public-endpoints.txt に追記"
echo "  B) 認証が必要な場合: verifyCronSecret() または token/password 比較を実装"
echo "  C) 廃止済みの場合: status: 410 を返すだけに書き換え"
exit 1
