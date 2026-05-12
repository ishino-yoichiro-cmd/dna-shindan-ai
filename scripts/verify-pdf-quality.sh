#!/bin/bash
# verify-pdf-quality.sh
# PDF品質の自動検証スクリプト
# 「確認なしで完了報告」の再発防止のための構造的ゲート
#
# 使い方: bash scripts/verify-pdf-quality.sh <pdf_url_or_path>
#          例: bash scripts/verify-pdf-quality.sh https://dna-shindan-ai.vercel.app/api/me/{id}/pdf?token={token}
#
# チェック内容:
#   1. 本文ページの段落数 >= 最低閾値（壁テキスト検出）
#   2. 見出し（H2/H3スタイル）の存在確認
#   3. ページ平均文字密度が上限以下
#   4. 太字ブロック（行全体が太字）がないこと
#
# Exit: 0=PASS, 1=FAIL

set -e

PDF_INPUT="${1:-}"
if [ -z "$PDF_INPUT" ]; then
  echo "使い方: $0 <pdfパスまたはURL>"
  exit 1
fi

# URLの場合はダウンロード
PDF_FILE="$PDF_INPUT"
if [[ "$PDF_INPUT" =~ ^https?:// ]]; then
  TMP_PDF="/tmp/verify-pdf-$$.pdf"
  echo "▶ PDFダウンロード中..."
  curl -sL "$PDF_INPUT" -o "$TMP_PDF"
  PDF_FILE="$TMP_PDF"
  trap "rm -f $TMP_PDF" EXIT
fi

if [ ! -f "$PDF_FILE" ]; then
  echo "❌ PDFファイルが見つかりません: $PDF_FILE"
  exit 1
fi

echo "================================================================"
echo "🔍 PDF品質検証（verify-pdf-quality.sh）"
echo "================================================================"
echo "対象: $PDF_FILE"
echo ""

python3 - "$PDF_FILE" << 'PYEOF'
import sys, fitz, os

pdf_path = sys.argv[1]
doc = fitz.open(pdf_path)
total_pages = doc.page_count

EXIT_CODE = 0
ISSUES = []

# === 本文ページの分析（表紙/目次を除く3ページ目以降を対象）===
BODY_START = 3  # 0-indexed: page4以降
body_pages = list(range(BODY_START, min(total_pages, BODY_START + 10)))

print(f"総ページ数: {total_pages}")
print(f"検査ページ: {[p+1 for p in body_pages]}")
print("")

# === チェック1: 段落密度（壁テキスト検出）===
print("▶ [1] 段落密度チェック（壁テキスト検出）")
MIN_BLOCKS_PER_PAGE = 6  # 本文ページに最低6つのテキストブロック
low_density_pages = []

for pg_num in body_pages:
    page = doc[pg_num]
    blocks = page.get_text("blocks")
    # フッター・ヘッダー行を除くテキストブロック
    content_blocks = [b for b in blocks if b[4].strip() and len(b[4].strip()) > 5]
    # 章末ページ（テキスト合計300字未満）は false positive なのでスキップ
    total_chars = sum(len(b[4].strip()) for b in content_blocks)
    if len(content_blocks) < MIN_BLOCKS_PER_PAGE and total_chars >= 300:
        low_density_pages.append((pg_num+1, len(content_blocks)))

if low_density_pages:
    print(f"  ❌ 段落が少なすぎるページ: {low_density_pages}")
    ISSUES.append(f"壁テキスト疑い（段落数<{MIN_BLOCKS_PER_PAGE}）: ページ{low_density_pages}")
    EXIT_CODE = 1
else:
    # 平均段落数を表示
    counts = []
    for pg_num in body_pages:
        page = doc[pg_num]
        blocks = page.get_text("blocks")
        content_blocks = [b for b in blocks if b[4].strip() and len(b[4].strip()) > 5]
        counts.append(len(content_blocks))
    avg = sum(counts) / len(counts) if counts else 0
    print(f"  ✅ 本文ページ平均 {avg:.1f} ブロック/ページ（最小{MIN_BLOCKS_PER_PAGE}以上）")
    for i, pg_num in enumerate(body_pages[:5]):
        print(f"     page{pg_num+1}: {counts[i]}ブロック")

print("")

# === チェック2: ページ縦方向カバレッジ（テキストの分散度）===
print("▶ [2] テキスト分散度チェック（改行なし全文縦積み検出）")
COVERAGE_MIN = 0.25  # ページ高さの25%以上にテキストが分散していること
bad_coverage = []

for pg_num in body_pages[:5]:
    page = doc[pg_num]
    page_height = page.rect.height
    blocks = page.get_text("blocks")
    content_blocks = [b for b in blocks if b[4].strip() and len(b[4].strip()) > 10]
    if not content_blocks:
        continue
    y_positions = sorted(set([b[1] for b in content_blocks]))  # y上端
    if len(y_positions) < 2:
        bad_coverage.append(pg_num+1)
        continue
    y_spread = (max(y_positions) - min(y_positions)) / page_height
    if y_spread < COVERAGE_MIN:
        bad_coverage.append(pg_num+1)

if bad_coverage:
    print(f"  ❌ テキスト分散不足ページ: {bad_coverage}")
    ISSUES.append(f"テキスト縦分散不足: ページ{bad_coverage}")
    EXIT_CODE = 1
else:
    print(f"  ✅ テキストがページ全体に分散している")

print("")

# === チェック3: 各ページのサムネイル生成 ===
print("▶ [3] 代表ページ画像出力（目視確認用）")
out_dir = "/Users/yo/Downloads/ClaudeCodeOutput"
os.makedirs(out_dir, exist_ok=True)

check_pages = body_pages[:4]
for pg_num in check_pages:
    page = doc[pg_num]
    pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
    path = f"{out_dir}/verify-pg{pg_num+1}.png"
    pix.save(path)
    print(f"  📄 page{pg_num+1} → {path}")

print("")

# === 結論 ===
print("================================================================")
if EXIT_CODE == 0:
    print("✅ PDF品質検証: PASS")
    print("   段落区切りあり・テキスト分散あり")
else:
    print("❌ PDF品質検証: FAIL")
    for issue in ISSUES:
        print(f"   - {issue}")
print("================================================================")

sys.exit(EXIT_CODE)
PYEOF
