#!/usr/bin/env bash
# =============================================================================
# verify-no-real-name.sh
# YOの本名・関連固有名詞がプロダクトに混入していないか検証する物理ガード
# =============================================================================
# 用途：
#   - Vercel/Netlify build時の prebuild フックで自動実行
#   - pre-commit hook
#   - 手動QC
# 違反時：exit 1 → ビルド即停止
#
# 使い方：
#   bash verify-no-real-name.sh [target_dir]
#   target_dir 省略時は current dir
#
# 拡張：禁則パターンは PATTERNS 配列に追加
# =============================================================================

set -e

TARGET_DIR="${1:-.}"

# ---- 禁則名前リスト（YOの本名・派生形・過去のリーク事例・P0-3 拡張）----
PATTERNS=(
  "石野"
  "洋一朗"
  "石野洋一朗"
  "Ishino"
  "ISHINO"
  "ishino"
  "yo-ichiro"
  "yoichiro"
  "Yoichiro"
  "YOICHIRO"
  "Yo Ichiro"
  "Yo-ichiro"
  "Yo Ishino"
  "Yo  Ishino"  # double-space variant
  "イシノ"
  "いしの"
  "ヨウイチロウ"
  "ようい​ちろう"
)

# ---- 検査対象拡張子（P0-3 拡張：svg/csv/ics/env/各種設定）----
EXTENSIONS=(
  "*.ts" "*.tsx" "*.js" "*.jsx" "*.mjs" "*.cjs"
  "*.json" "*.jsonl" "*.md" "*.mdx" "*.html" "*.htm" "*.css" "*.scss"
  "*.txt" "*.yml" "*.yaml" "*.toml"
  "*.env.example" "*.env.sample"
  "*.sql" "*.svg" "*.csv" "*.tsv" "*.ics"
  "*.xml" "*.rss"
  "Dockerfile" "Procfile" "Makefile" "LICENSE" "README"
)

# ---- 除外ディレクトリ ----
EXCLUDE_DIRS=(
  "node_modules"
  ".next"
  ".git"
  ".vercel"
  ".github"        # GitHub Actions yml に検出パターンを書き込むため除外
  "dist"
  "build"
  "out"
  "coverage"
)

# ---- include / exclude 引数組み立て ----
INCLUDE_ARGS=""
for ext in "${EXTENSIONS[@]}"; do
  INCLUDE_ARGS="$INCLUDE_ARGS --include=$ext"
done

EXCLUDE_ARGS=""
for d in "${EXCLUDE_DIRS[@]}"; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude-dir=$d"
done

# ---- 検査ループ ----
VIOLATIONS=0
VIOLATION_LOG=""

for pattern in "${PATTERNS[@]}"; do
  matches=$(grep -rn $INCLUDE_ARGS $EXCLUDE_ARGS "$pattern" "$TARGET_DIR" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    VIOLATION_LOG="$VIOLATION_LOG
🚨 VIOLATION: '$pattern' found in:
$(echo "$matches" | head -20)
"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# ---- 判定 ----
if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo "🚨 [verify-no-real-name] BUILD STOPPED — 本名混入を検出"
  echo "════════════════════════════════════════════════════════════════"
  echo "$VIOLATION_LOG"
  echo ""
  echo "違反パターン数: $VIOLATIONS"
  echo ""
  echo "YOの本名・関連固有名詞をプロダクトに含めることは絶対禁止です。"
  echo "代替命名：「サンプル ユーザー」「テスト ユーザー」「Sample User」等を使用してください。"
  echo "════════════════════════════════════════════════════════════════"
  exit 1
fi

echo "✅ [verify-no-real-name] PASS — 本名・関連固有名詞の混入なし ($TARGET_DIR)"
exit 0
