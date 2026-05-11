// 生成テキスト後処理 + QCゲート
//
// 役割：Gemini生成テキストに対して以下を実施する
//   1. HTMLコメント除去（INTEGRATION_TAGSブロック含む）
//   2. スコアラベル残存チェック＋サニタイズ
//   3. セクション番号ヘッダー露出チェック＋サニタイズ
//   4. 総合QCゲート（issues配列＋passed判定を返す）
//
// 修正できるものは自動修正し、修正不能なものはissuesに記録してretry判断材料にする。

// ============================================================================
// 1. HTMLコメント除去
// ============================================================================

/**
 * <!-- ... --> 形式のHTMLコメントを全て除去する。
 * INTEGRATION_TAGSブロックもここで消える。
 */
export function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '').trim();
}

// ============================================================================
// 2. スコアラベルサニタイズ
// ============================================================================

// エニアグラム型コード（E1〜E9）＋日本語ラベルのパターン
// 例: "E6（安全志向）"  "E3(達成者)"  "E2タイプ"
const ENNEA_LABEL_PATTERN = /E[1-9](?:[（(][^）)]{2,10}[）)])?(?:タイプ|型)?/g;

// RIASEC コード単体参照パターン（文脈を判断せず単純に削除すると誤爆するため検出のみ）
const RIASEC_CODE_PATTERN = /(?:RIASEC[^\n]*?[A-Z][A-Z,\s]*=|([RIASCE]{1}=[^\s,。]{2,15}))/g;

// VAK コード単体
const VAK_CODE_PATTERN = /[VAK]=[0-9]+(?:\.[0-9]+)?/g;

/**
 * 既知のスコアラベルコード参照を除去する。
 * 除去した箇所の数を返す（0=問題なし）。
 */
export function sanitizeScoreLabels(text: string): { text: string; removedCount: number } {
  let count = 0;
  let result = text;

  result = result.replace(ENNEA_LABEL_PATTERN, (match) => {
    // E が文章中の普通の単語として使われている場合をスキップ
    // 「E6（安全志向）」のような明確なコード参照のみ削除
    if (/E[1-9]/.test(match)) {
      count++;
      return '';
    }
    return match;
  });

  // VAK コード（V=83, A=50 等）は数値付きのみ削除
  result = result.replace(VAK_CODE_PATTERN, () => {
    count++;
    return '';
  });

  return { text: result.replace(/\s{2,}/g, ' ').trim(), removedCount: count };
}

// ============================================================================
// 3. セクション番号ヘッダー検出＋除去
// ============================================================================

// 章の本文に出現してはいけないセクション番号見出し
// 「1. 観察」「2. 深掘り解釈」「## 1. 観察」など
const SECTION_HEADER_PATTERNS = [
  // 「1. 観察」「2. 深掘り解釈」「6. 章末まとめ・読者への問い」
  /^(?:#{1,3}\s*)?[1-6][.．]\s+(?:観察|深掘り|具体的な行動|気づき|落とし穴|章末)[^\n]*/gm,
  // 「【1. 観察（...）】」
  /^【[1-6][.．]\s+[^】]{2,30}】\s*/gm,
  // Markdown見出し「## 1. 観察」
  /^#{1,3}\s+[1-6][.．]\s+/gm,
];

/**
 * セクション番号見出しを検出・除去する。
 * 除去した行数を返す。
 */
export function sanitizeSectionHeaders(text: string): { text: string; removedLines: number } {
  let count = 0;
  let result = text;

  for (const pattern of SECTION_HEADER_PATTERNS) {
    result = result.replace(pattern, (match) => {
      count++;
      // 見出し行を除去（前後の改行は残す）
      return match.replace(/[^\n]/g, '');
    });
  }

  // 連続空行を1行に圧縮
  result = result.replace(/\n{3,}/g, '\n\n').trim();
  return { text: result, removedLines: count };
}

// ============================================================================
// 4. 総合QCゲート
// ============================================================================

export interface QcResult {
  /** true = 全チェック通過（sanitize後） */
  passed: boolean;
  /** sanitize済みのテキスト */
  sanitizedText: string;
  /** 検出・修正した問題のリスト（空なら問題なし） */
  issues: string[];
  /** 自動修正で対処できなかった致命的問題があるか */
  hasFatalIssue: boolean;
}

/**
 * 生成テキストに対してHTMLコメント除去・ラベルサニタイズ・ヘッダー除去を行い、
 * QC結果を返す。sanitizedText は常に修正済みテキストを含む。
 */
export function runQualityGate(rawText: string, chapterId: string): QcResult {
  const issues: string[] = [];
  let text = rawText;

  // ── Step 1: HTMLコメント除去 ──
  const htmlCommentMatch = text.match(/<!--[\s\S]*?-->/g);
  if (htmlCommentMatch) {
    // chapter1 は INTEGRATION_TAGS を意図的に出力するので strip はするが issue として記録しない
    if (chapterId !== 'chapter1') {
      issues.push(`HTMLコメント断片を検出・除去（${htmlCommentMatch.length}件）`);
    }
    text = stripHtmlComments(text);
  } else if (chapterId === 'chapter1') {
    // chapter1 で INTEGRATION_TAGS が全く出力されていない場合も警告
    // （後工程でタグが必要なため。ただし章品質には影響しない）
  }

  // ── Step 2: スコアラベルサニタイズ ──
  const { text: labelFixed, removedCount } = sanitizeScoreLabels(text);
  if (removedCount > 0) {
    issues.push(`スコアラベルコード参照を自動除去（${removedCount}件）: システムプロンプト強化が必要`);
  }
  text = labelFixed;

  // ── Step 3: セクション番号ヘッダー除去 ──
  const { text: headerFixed, removedLines } = sanitizeSectionHeaders(text);
  if (removedLines > 0) {
    issues.push(`セクション番号ヘッダーを自動除去（${removedLines}行）: システムプロンプト強化が必要`);
  }
  text = headerFixed;

  // ── Step 4: 最小文字数チェック（実質文字数）──
  const cleanLen = text.replace(/\s/g, '').length;
  let hasFatalIssue = false;

  if (cleanLen < 500) {
    issues.push(`文字数が極端に少ない（${cleanLen}字）: 再生成が必要`);
    hasFatalIssue = true;
  }

  // ── Step 5: 切断チェック（文末が途中か）──
  const lastChars = text.slice(-5).trim();
  const lastChar = lastChars.slice(-1);
  const validEndings = new Set(['。', '！', '？', '」', '）', '】', '』', '…', '!', '?', '`']);
  const isEnglishEnd = /[a-zA-Z0-9)\]>]$/.test(lastChar);
  if (!validEndings.has(lastChar) && !isEnglishEnd && text.length > 100) {
    issues.push(`文末が不完全（末尾: 「${text.slice(-15).replace(/\n/g, ' ')}」）`);
    hasFatalIssue = true;
  }

  return {
    passed: !hasFatalIssue,
    sanitizedText: text,
    issues,
    hasFatalIssue,
  };
}

// ============================================================================
// 5. リトライ用 強化指示追記
// ============================================================================

/**
 * QC失敗時のリトライで末尾に追加する強化指示。
 * 問題の種類に応じて異なる指示を返す。
 */
export function buildRetryInstruction(issues: string[]): string {
  const lines: string[] = ['---', '## 厳守事項（再生成）'];
  if (issues.some(i => i.includes('ヘッダー'))) {
    lines.push('- 「1. 観察」「2. 深掘り解釈」等のセクション番号と見出しを**絶対に本文に含めない**。内部構成として使うだけ。');
  }
  if (issues.some(i => i.includes('ラベル'))) {
    lines.push('- E1〜E9、V/A/K等のスコアコードを**本文に書かない**。概念として言語化するだけ。');
  }
  if (issues.some(i => i.includes('HTMLコメント') || i.includes('html'))) {
    lines.push('- HTMLコメント記法（<!-- -->）を**一切出力しない**。');
  }
  if (issues.some(i => i.includes('文末'))) {
    lines.push('- 必ず文章を完結させること。最後の文を「。」「？」で締めること。');
  }
  return lines.join('\n');
}
