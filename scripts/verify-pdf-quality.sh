#!/bin/bash
# verify-pdf-quality.sh
# PDF視覚品質の自動検証スクリプト（強化版）
#
# チェック内容:
#   [1] 段落密度（壁テキスト検出）
#   [2] テキスト分散度
#   [3] テキスト重なり検知（行重なり・overflow検出）← 新規追加
#   [4] テキストクリップ検知（ページ外にはみ出したテキスト）← 新規追加
#   [5] 孤立見出し検知（ページ末尾に見出しだけ残っている）← 新規追加
#   [6] 代表ページ画像出力（目視確認用）
#
# Exit: 0=PASS, 1=FAIL
# 使い方: bash scripts/verify-pdf-quality.sh <pdf_url_or_path>

set -e

PDF_INPUT="${1:-}"
if [ -z "$PDF_INPUT" ]; then
  echo "使い方: $0 <pdfパスまたはURL>"
  exit 1
fi

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
echo "🔍 PDF品質検証 v2（verify-pdf-quality.sh）"
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

BODY_START = 3  # 表紙/目次除く
body_pages = list(range(BODY_START, total_pages))

print(f"総ページ数: {total_pages}")
print(f"検査ページ数: {len(body_pages)}（page{BODY_START+1}〜{total_pages}）")
print("")

# ================================================================
# [1] 段落密度（壁テキスト検出）
# ================================================================
print("▶ [1] 段落密度チェック（壁テキスト検出）")
MIN_BLOCKS_PER_PAGE = 5
low_density_pages = []

for pg_num in body_pages:
    page = doc[pg_num]
    blocks = page.get_text("blocks")
    content_blocks = [b for b in blocks if b[4].strip() and len(b[4].strip()) > 5]
    total_chars = sum(len(b[4].strip()) for b in content_blocks)
    if len(content_blocks) < MIN_BLOCKS_PER_PAGE and total_chars >= 300:
        low_density_pages.append((pg_num+1, len(content_blocks)))

if low_density_pages:
    print(f"  ❌ 段落が少なすぎるページ: {low_density_pages}")
    ISSUES.append(f"壁テキスト疑い: page{[p[0] for p in low_density_pages]}")
    EXIT_CODE = 1
else:
    counts = []
    for pg_num in body_pages[:5]:
        page = doc[pg_num]
        blocks = page.get_text("blocks")
        content_blocks = [b for b in blocks if b[4].strip() and len(b[4].strip()) > 5]
        counts.append(len(content_blocks))
    avg = sum(counts) / len(counts) if counts else 0
    print(f"  ✅ 平均 {avg:.1f} ブロック/ページ")
print("")

# ================================================================
# [2] テキスト分散度
# ================================================================
print("▶ [2] テキスト分散度チェック")
COVERAGE_MIN = 0.25
bad_coverage = []

for pg_num in body_pages[:5]:
    page = doc[pg_num]
    page_height = page.rect.height
    blocks = page.get_text("blocks")
    content_blocks = [b for b in blocks if b[4].strip() and len(b[4].strip()) > 10]
    if not content_blocks:
        continue
    y_positions = sorted(set([b[1] for b in content_blocks]))
    if len(y_positions) < 2:
        bad_coverage.append(pg_num+1)
        continue
    y_spread = (max(y_positions) - min(y_positions)) / page_height
    if y_spread < COVERAGE_MIN:
        bad_coverage.append(pg_num+1)

if bad_coverage:
    print(f"  ❌ テキスト分散不足: page{bad_coverage}")
    ISSUES.append(f"テキスト縦分散不足: page{bad_coverage}")
    EXIT_CODE = 1
else:
    print(f"  ✅ テキスト分散OK")
print("")

# ================================================================
# [3] テキスト重なり検知（行が重なっているページを検出）
# ================================================================
print("▶ [3] テキスト重なり検知（行重なり・overflow）")
overlap_pages = []

for pg_num in body_pages:
    page = doc[pg_num]
    page_height = page.rect.height
    blocks = page.get_text("blocks")
    content_blocks = [b for b in blocks if b[4].strip() and len(b[4].strip()) > 3]

    overlaps_found = 0
    for i in range(len(content_blocks)):
        for j in range(i+1, len(content_blocks)):
            b1 = content_blocks[i]
            b2 = content_blocks[j]
            # bounding box: (x0, y0, x1, y1, text, ...)
            x1_l, y1_top, x1_r, y1_bot = b1[0], b1[1], b1[2], b1[3]
            x2_l, y2_top, x2_r, y2_bot = b2[0], b2[1], b2[2], b2[3]

            # ── Y方向の重なり確認 ──
            overlap_height = min(y1_bot, y2_bot) - max(y1_top, y2_top)
            block_height = min(y1_bot - y1_top, y2_bot - y2_top)
            if overlap_height <= 0 or block_height <= 0:
                continue
            y_overlap_ratio = overlap_height / block_height
            if y_overlap_ratio <= 0.30:
                continue

            # ── X方向の重なり確認（テーブル横並びセルの誤検知防止）──
            # テーブルの同一行セルは y 重なりが大きいが x が分離している → 除外
            x_overlap = min(x1_r, x2_r) - max(x1_l, x2_l)
            if x_overlap <= 2:  # x方向に2pt以下しか重ならないものは除外
                continue

            # ── フッター・ヘッダー同士の重なりは除外 ──
            if y1_top > page_height * 0.92 and y2_top > page_height * 0.92:
                continue
            if y1_bot < page_height * 0.08 and y2_bot < page_height * 0.08:
                continue
            # どちらかがフッター領域（下部8%）に完全に収まる場合も除外
            if y1_top > page_height * 0.92 or y2_top > page_height * 0.92:
                continue

            overlaps_found += 1

    if overlaps_found > 0:
        overlap_pages.append((pg_num+1, overlaps_found))

if overlap_pages:
    print(f"  ❌ テキスト重なり検出: {overlap_pages}")
    ISSUES.append(f"テキスト重なり: page{[p[0] for p in overlap_pages]}")
    EXIT_CODE = 1
else:
    print(f"  ✅ テキスト重なりなし（全{len(body_pages)}ページ検査）")
print("")

# ================================================================
# [4] テキストクリップ検知（ページ外にはみ出したテキスト）
# ================================================================
print("▶ [4] テキストクリップ検知（ページ境界外テキスト）")
clip_pages = []

for pg_num in body_pages:
    page = doc[pg_num]
    page_height = page.rect.height
    page_width = page.rect.width
    blocks = page.get_text("blocks")

    for b in blocks:
        if not b[4].strip():
            continue
        x0, y0, x1, y1 = b[0], b[1], b[2], b[3]
        # クリップ判定：真にページ外に出ているテキストのみ検出
        # フッター（絶対配置、下部40pt以内）は除外 - 意図的配置
        # paddingBottom=56pt なので本文は page_height-56 以上には通常出てこない
        # ただし y1 が page_height を超えている場合のみ真のクリップとして検出
        clipped = False
        if y1 > page_height + 2:  # ページ高さを超過（実際にはみ出している）
            clipped = True
        if y0 < -5:               # 上端クリップ
            clipped = True
        if x0 < -10 or x1 > page_width + 10:  # 横クリップ（余裕10pt）
            clipped = True
        if clipped and len(b[4].strip()) > 5:
            clip_pages.append((pg_num+1, round(y0), round(y1), b[4].strip()[:30]))
            break  # ページあたり1件で十分

if clip_pages:
    print(f"  ❌ クリップ検出:")
    for cp in clip_pages[:5]:
        print(f"     page{cp[0]}: y={cp[1]}~{cp[2]} '{cp[3]}...'")
    ISSUES.append(f"テキストクリップ: page{[p[0] for p in clip_pages]}")
    EXIT_CODE = 1
else:
    print(f"  ✅ クリップなし")
print("")

# ================================================================
# [5] 孤立見出し検知（ページ末尾に大きいテキストのみ残っている）
# ================================================================
print("▶ [5] 孤立見出し検知（ページ末尾孤立）")
orphan_pages = []

for pg_num in body_pages[:-1]:  # 最終ページは除く
    page = doc[pg_num]
    page_height = page.rect.height
    blocks = page.get_text("dict")["blocks"]

    # テキストブロックのみ取得
    text_blocks = []
    for b in blocks:
        if b.get("type") != 0:  # type 0 = text
            continue
        for line in b.get("lines", []):
            for span in line.get("spans", []):
                if span.get("text", "").strip():
                    text_blocks.append({
                        "y": span["bbox"][1],
                        "y1": span["bbox"][3],
                        "size": span.get("size", 10),
                        "text": span["text"].strip(),
                    })

    if not text_blocks:
        continue

    # ページ下部30%のブロック
    bottom_threshold = page_height * 0.70
    bottom_blocks = [b for b in text_blocks if b["y"] > bottom_threshold]
    above_blocks = [b for b in text_blocks if b["y"] <= bottom_threshold]

    if not bottom_blocks or not above_blocks:
        continue

    # 下部にある最大フォントサイズを取得
    max_font_in_bottom = max(b["size"] for b in bottom_blocks)
    # 上部にある最大フォントサイズ
    max_font_above = max(b["size"] for b in above_blocks)

    # 下部のブロック数が少なく（1-2行）、かつフォントが大きい（12pt以上）= 孤立見出し疑い
    bottom_text_count = len(bottom_blocks)
    if bottom_text_count <= 3 and max_font_in_bottom >= 12 and max_font_above >= 12:
        # 下部のテキスト内容確認
        bottom_text = " ".join(b["text"] for b in bottom_blocks[:3])
        orphan_pages.append((pg_num+1, bottom_text[:40]))

if orphan_pages:
    print(f"  ⚠️  孤立見出し疑い（ページ末尾に見出しのみ）:")
    for op in orphan_pages[:5]:
        print(f"     page{op[0]}: '{op[1]}'")
    # 孤立見出しは警告のみ（FAILにはしない - 短章末は正常のケースもある）
    print(f"     → 視覚確認推奨（自動FAIL対象外）")
else:
    print(f"  ✅ 孤立見出しなし")
print("")

# ================================================================
# [6] 代表ページ画像出力（目視確認用）
# ================================================================
print("▶ [6] 代表ページ画像出力（目視確認用）")
out_dir = "/Users/yo/Downloads/ClaudeCodeOutput"
os.makedirs(out_dir, exist_ok=True)

# 問題ページ優先で最大6ページ出力
problem_pages = list(set([p[0]-1 for p in overlap_pages] + [p[0]-1 for p in clip_pages]))
check_pages = sorted(set(problem_pages + list(body_pages[:4])))[:6]

for pg_num in check_pages:
    if pg_num >= total_pages:
        continue
    page = doc[pg_num]
    pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
    path = f"{out_dir}/verify-pg{pg_num+1}.png"
    pix.save(path)
    marker = " ← 問題検出" if pg_num in problem_pages else ""
    print(f"  📄 page{pg_num+1} → {path}{marker}")

print("")

# ================================================================
# 結論
# ================================================================
print("================================================================")
if EXIT_CODE == 0:
    print("✅ PDF品質検証 v2: PASS")
    print("   重なりなし・クリップなし・分散OK")
else:
    print("❌ PDF品質検証 v2: FAIL")
    for issue in ISSUES:
        print(f"   - {issue}")
print("================================================================")

sys.exit(EXIT_CODE)
PYEOF
