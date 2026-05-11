#!/bin/bash
# vercel-pre-build-gate.sh
# Vercel の "Ignored Build Step" 機能から呼ばれる物理ガード。
#
# 設定方法（YO が Vercel Dashboard で設定）：
#   Project Settings → Git → "Ignored Build Step"
#   Command: bash scripts/vercel-pre-build-gate.sh
#
# Vercel の仕様：
#   exit 0 → build を SKIP（=検証 NG・deploy しない）
#   exit 1 → build を続行（=検証 PASS・deploy する）
#   ※注意：Vercel は他のスクリプトと逆の semantics
#
# このゲートが Vercel container 内で **必ず最初に走る**。
# CLI/Dashboard/API/cron 経路すべてが Vercel build を経由するため、
# ローカル wrapper を一切信頼しない構造的防御となる。
#
# Usage: ./scripts/vercel-pre-build-gate.sh
set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================================================"
echo "🛡  Vercel Pre-Build Gate (platform-enforced)"
echo "================================================================"

PROJECT_DIR="$(pwd)"
GATE_FAIL=0
declare -a FAILURES

# Vercel build container 環境の git history を完全化
# （Ignored Build Step の `VERCEL_GIT_PREVIOUS_SHA` で diff が必要な場合）
git rev-parse HEAD >/dev/null 2>&1 && {
  git fetch --depth=20 origin 2>/dev/null || true
}

# === [1] verify-deploy-ready-light.sh（ローカル light 版）===
echo ""
echo "▶ [1] verify-deploy-ready-light.sh"
if [ -x "$PROJECT_DIR/scripts/verify-deploy-ready-light.sh" ]; then
  if bash "$PROJECT_DIR/scripts/verify-deploy-ready-light.sh" "$PROJECT_DIR"; then
    echo "  ✅ PASS"
  else
    echo "  ❌ FAIL"
    FAILURES+=("verify-deploy-ready-light")
    GATE_FAIL=1
  fi
else
  echo "  ⚠️  scripts/verify-deploy-ready-light.sh が未配置（要 secretary-harness-install）"
  FAILURES+=("verify-deploy-ready-light が未配置（fail-secure）")
  GATE_FAIL=1
fi

# === [2] verify-no-real-name.sh ===
echo ""
echo "▶ [2] verify-no-real-name.sh"
if [ -x "$PROJECT_DIR/scripts/verify-no-real-name.sh" ]; then
  if bash "$PROJECT_DIR/scripts/verify-no-real-name.sh" "$PROJECT_DIR"; then
    echo "  ✅ PASS"
  else
    echo "  ❌ FAIL — 本名混入検出"
    FAILURES+=("verify-no-real-name")
    GATE_FAIL=1
  fi
else
  echo "  ⚠️  scripts/verify-no-real-name.sh が未配置"
fi

# === [3] canonical-lock-verify ===
echo ""
echo "▶ [3] Canonical Pages Hash Lock"
if [ -f "$PROJECT_DIR/.harness/canonical-lock.json" ]; then
  python3 - "$PROJECT_DIR" "$PROJECT_DIR/.harness/canonical-lock.json" <<'PYEOF'
import hashlib, json, os, sys
target, lock_file = sys.argv[1], sys.argv[2]
with open(lock_file) as f:
    locked = json.load(f)
hashes = locked.get('hashes', {})
violations = []
for rel, expected in hashes.items():
    abs_p = os.path.join(target, rel)
    if not os.path.isfile(abs_p):
        violations.append((rel, 'DELETED', expected, 'N/A'))
        continue
    with open(abs_p, 'rb') as fp:
        actual = hashlib.sha256(fp.read()).hexdigest()
    if actual != expected:
        violations.append((rel, 'CHANGED', expected, actual))
if not violations:
    print(f"  ✅ 全 {len(hashes)} 件 canonical 一致")
    sys.exit(0)
print(f"  🚨 [CRITICAL] canonical 違反 {len(violations)} 件:")
for rel, kind, exp, act in violations:
    print(f"    ❌ {rel} → {kind}")
sys.exit(1)
PYEOF
  if [ $? -ne 0 ]; then
    FAILURES+=("canonical-lock 違反")
    GATE_FAIL=1
  fi
else
  echo "  ⏭  canonical-lock.json 不在（YO が lock-canonical-pages.sh で設定可）"
fi

# === [4] サイレントフォールバック禁止（補強・冗長だが多重防御）===
echo ""
echo "▶ [4] Silent Fallback の最終確認"
FB=$(grep -rE "\?\?\s*['\"](19[0-9]{2}|20[0-9]{2})-[0-9]{2}-[0-9]{2}['\"]|\?\?\s*['\"](サンプル|デフォルト)" \
  "$PROJECT_DIR/src" "$PROJECT_DIR/app" 2>/dev/null \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=test --exclude-dir=tests \
  | grep -vE '\.test\.|\.spec\.|_fixture' || true)
if [ -n "$FB" ]; then
  echo "  🚨 [CRITICAL] サイレントフォールバック残存"
  echo "$FB" | head -5 | sed 's/^/    /'
  FAILURES+=("silent-fallback")
  GATE_FAIL=1
else
  echo "  ✅ サイレントフォールバックなし"
fi

# === 結論 ===
echo ""
echo "================================================================"
if [ "$GATE_FAIL" -eq 0 ]; then
  echo -e "${GREEN}✅ Vercel Pre-Build Gate: PASS — build 続行${NC}"
  echo "================================================================"
  exit 1   # Vercel: exit 1 = "proceed with build"
else
  echo -e "${RED}❌ Vercel Pre-Build Gate: FAIL — build SKIP${NC}"
  echo ""
  echo "失敗項目："
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  echo "================================================================"
  exit 0   # Vercel: exit 0 = "skip build"
fi
