#!/bin/bash
# verify-deploy-ready-light.sh
# Vercel build 環境で動く軽量 verify。プロダクト内 scripts/ に配置し、
# vercel.json の buildCommand から呼ばれる。外部 _shared/ への依存なし。
#
# 検出項目（最優先のみ・誤検出ゼロを優先）：
#   1. サイレントフォールバック (?? 'YYYY-MM-DD' 等) — DNA診断AI 偽生年月日真因
#   2. env デフォルト値ハードコード
#   3. mode:'no-cors' 残存
#   4. SERVICE_ROLE_KEY のフロント流出
#
# Usage: verify-deploy-ready-light.sh <project_dir>
# Exit:  0=PASS, 1=FAIL（Vercel build 自体が失敗するため deploy されない）
set -e

PROJECT_DIR="${1:-.}"
PROJECT_ABS=$(cd "$PROJECT_DIR" && pwd)

EXIT_CODE=0
echo "================================================================"
echo "🛡  Verify Deploy Ready (Vercel build-time light)"
echo "================================================================"
echo "Project: $PROJECT_ABS"
echo ""

EXCLUDE='--exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist --exclude-dir=build --exclude-dir=test --exclude-dir=tests --exclude-dir=__tests__ --exclude-dir=fixtures --exclude-dir=e2e'

# === [1] サイレントフォールバック検出 ===
echo "▶ [1] Silent Fallback Pattern (DNA診断AI 偽生年月日 真因再発防止)"
# (1a) ?? / || 'YYYY-MM-DD' / 'サンプル' パターン（P0-1: ?? と || 両方）
# (1a) Backtick template literal `1985-01-01` も検出（P0-2）
FB1=$(grep -rE "(\?\?|\|\|)\s*['\"\`](19[0-9]{2}|20[0-9]{2})-[0-9]{2}-[0-9]{2}['\"\`]|(\?\?|\|\|)\s*['\"\`](サンプル|テスト|デフォルト|example|user@example)" \
  "$PROJECT_ABS" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  $EXCLUDE 2>/dev/null \
  | grep -vE '\.test\.|\.spec\.|_test\.|_fixture' || true)
# (1b) const X = '1985-01-01' / useState('1985-01-01') / value=...||'1985-01-01' のような代入リテラル
# 除外：min="1900-01-01" / max="..." HTML 属性、コメント行、test fixture
FB2=$(grep -rnE "(=\s*['\"](19[0-9]{2}|20[0-9]{2})-[0-9]{2}-[0-9]{2}['\"]|useState\s*\(\s*['\"](19[0-9]{2}|20[0-9]{2})-[0-9]{2}-[0-9]{2}['\"]|\|\|\s*['\"](19[0-9]{2}|20[0-9]{2})-[0-9]{2}-[0-9]{2}['\"])" \
  "$PROJECT_ABS" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  $EXCLUDE 2>/dev/null \
  | grep -vE '\.test\.|\.spec\.|_test\.|_fixture' \
  | grep -vE '^[^:]+:[0-9]+:\s*(//|\*|/\*)' \
  | grep -vE '\b(min|max|placeholder|defaultValue)\s*=\s*["'"'"']' \
  || true)
# (1c) useState(new Date()) / defaultValues: { x: new Date() } / value=today() のような動的代用値
# (1d) 三項演算子 X ? X : '1985-01-01' のような fallback（P0-2 C-8）
# (1e) epoch 数値 fallback ?? 473299200 等の long unix epoch（P0-2 C-8）
FB3=$(grep -rnE "(useState|useRef)\s*\(\s*new\s+Date\s*\(|defaultValue[s]?\s*[:=]\s*[{(]?\s*[a-zA-Z_]*\s*[:=]?\s*new\s+Date\s*\(" \
  "$PROJECT_ABS"/src "$PROJECT_ABS"/app "$PROJECT_ABS"/components 2>/dev/null \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  $EXCLUDE \
  | grep -vE '\.test\.|\.spec\.|_test\.|_fixture' || true)
FB4=$(grep -rnE "[a-zA-Z_][a-zA-Z0-9_.]*\s*\?\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*:\s*['\"\`](19[0-9]{2}|20[0-9]{2})-[0-9]{2}-[0-9]{2}['\"\`]" \
  "$PROJECT_ABS"/src "$PROJECT_ABS"/app "$PROJECT_ABS"/components 2>/dev/null \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  $EXCLUDE \
  | grep -vE '\.test\.|\.spec\.|_test\.|_fixture' || true)
# 真の Unix epoch（10 桁以上）または既知の代用 epoch のみ。?? 0 / ?? -1 等は count 等の正常パターンなので除外。
FB5=$(grep -rnE "(\?\?|\|\|)\s*(31556952000|473299200|315532800|[1-9][0-9]{9,})\b" \
  "$PROJECT_ABS"/src "$PROJECT_ABS"/app 2>/dev/null \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  $EXCLUDE \
  | grep -vE '\.test\.|\.spec\.|_test\.|_fixture' || true)

if [ -n "$FB1" ] || [ -n "$FB2" ] || [ -n "$FB3" ] || [ -n "$FB4" ] || [ -n "$FB5" ]; then
  echo "  🚨 [CRITICAL] サイレントフォールバック検出："
  [ -n "$FB1" ] && echo "$FB1" | head -10 | sed 's/^/   [?? \/ || fallback] /'
  [ -n "$FB2" ] && echo "$FB2" | head -10 | sed 's/^/   [代入リテラル] /'
  [ -n "$FB3" ] && echo "$FB3" | head -10 | sed 's/^/   [動的代用値 new Date()] /'
  [ -n "$FB4" ] && echo "$FB4" | head -10 | sed 's/^/   [三項演算子 fallback] /'
  [ -n "$FB5" ] && echo "$FB5" | head -10 | sed 's/^/   [epoch数値 fallback] /'
  echo "     → 必須項目は throw / 400 返却・初期値は空 or null にする"
  EXIT_CODE=1
else
  echo "  ✅ サイレントフォールバックなし"
fi
echo ""

# === [2] env デフォルト値ハードコード ===
echo "▶ [2] env Default Hardcode"
HARDCODED=$(grep -rE "process\.env\.[A-Z_]+\s*\|\|\s*['\"][a-zA-Z0-9_-]{8,}['\"]" \
  "$PROJECT_ABS"/src "$PROJECT_ABS"/app "$PROJECT_ABS"/api "$PROJECT_ABS"/lib 2>/dev/null \
  | grep -vE 'node_modules|test|spec|process\.env\.NODE_ENV|\|\|\s*null\b|\|\|\s*[\"'"'"']\s*[\"'"'"']|\|\|\s*[\"'"'"']http' \
  | head -10 || true)
if [ -n "$HARDCODED" ]; then
  echo "  🚨 [CRITICAL] env デフォルト値ハードコード（INC-2026-05-02-02 再発リスク）："
  echo "$HARDCODED" | sed 's/^/   /'
  EXIT_CODE=1
else
  echo "  ✅ env ハードコードなし"
fi
echo ""

# === [3] mode:'no-cors' ===
echo "▶ [3] mode:'no-cors' (INC-2026-04-28-01)"
NO_CORS=$(grep -rln "mode:.*'no-cors'\|mode:.*\"no-cors\"" "$PROJECT_ABS" \
  --include="*.html" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" \
  $EXCLUDE 2>/dev/null || true)
if [ -n "$NO_CORS" ]; then
  echo "  🚨 [CRITICAL] mode:'no-cors' 残存（データ偽成功リスク）："
  echo "$NO_CORS" | head -5 | sed 's/^/   /'
  EXIT_CODE=1
else
  echo "  ✅ mode:'no-cors' なし"
fi
echo ""

# === [4] SERVICE_ROLE_KEY フロント流出 ===
echo "▶ [4] SERVICE_ROLE_KEY Frontend Leak"
LEAK=$(grep -rE "SERVICE_ROLE_KEY" "$PROJECT_ABS" \
  --include="*.html" --include="*.tsx" --include="*.jsx" --include="*.ts" \
  $EXCLUDE 2>/dev/null \
  | grep -vE '/api/|/server/|/scripts/|server\.ts:|\.server\.ts:' || true)
if [ -n "$LEAK" ]; then
  echo "  🚨 [CRITICAL] SERVICE_ROLE_KEY のクライアント側流出："
  echo "$LEAK" | head -5 | sed 's/^/   /'
  EXIT_CODE=1
else
  echo "  ✅ SERVICE_ROLE_KEY のフロント流出なし"
fi
echo ""

# === 結論 ===
echo "================================================================"
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✅ Verify Deploy Ready (Light): PASS"
else
  echo "❌ Verify Deploy Ready (Light): FAIL — Vercel build 中止"
fi
echo "================================================================"

exit "$EXIT_CODE"
