// CLAUDE.md「絶対禁則」: 本名 UI 出口防御層（runtime sanitize）
//
// ビルド時防御は `_shared/scripts/verify-no-real-name.sh` が
// プロダクトコード・UI・サンプルデータ・テストfixture等を grep して
// 本名検出時に build を物理停止させる。
//
// しかしDBに「ユーザーが入力した本人の本名」が保存される経路は
// build時 grep の対象外（DB値はランタイムでしか見えない）。
// admin画面など本人以外の目に触れる UI で本名が露出するのを防ぐため、
// レスポンス出口でこのサニタイズを通す。
//
// 検出パターンは process.env.REAL_NAME_PATTERNS（カンマ区切り regex）を
// 「唯一の情報源」とする。コード上に本名（漢字・カナ・ローマ字）を直書きしない。
// パターン定義の単一情報源は `_shared/scripts/verify-no-real-name.sh` の PATTERNS 配列。

// パターンは anchored（^...$）の場合があるが、DB上のfirst_name/last_nameは
// 前後空白や姓名片方のみのケースもあるため、部分マッチ動作になるよう
// 先頭末尾のアンカーを剥がして比較する。
function stripAnchors(pattern: string): string {
  return pattern.replace(/^\^/, '').replace(/\$$/, '');
}

const ENV_PATTERNS = (process.env.REAL_NAME_PATTERNS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    try {
      return new RegExp(stripAnchors(s), 'iu');
    } catch {
      return null;
    }
  })
  .filter((p): p is RegExp => p !== null);

const REPLACEMENT = 'YO';

/** 文字列が本名検出パターンに合致したら "YO" に置換する（部分一致） */
export function sanitizeRealName(value: string | null | undefined): string {
  if (!value) return '';
  for (const p of ENV_PATTERNS) {
    if (p.test(value)) return REPLACEMENT;
  }
  return value;
}

/** 本名検出：姓・名・姓名連結（空白あり/なし）の全パターンで判定 */
export function isRealName(row: { first_name?: unknown; last_name?: unknown }): boolean {
  const ln = typeof row.last_name === 'string' ? row.last_name : '';
  const fn = typeof row.first_name === 'string' ? row.first_name : '';
  const candidates = [ln, fn, `${ln}${fn}`, `${ln} ${fn}`, `${fn}${ln}`, `${fn} ${ln}`];
  for (const c of candidates) {
    if (!c) continue;
    for (const p of ENV_PATTERNS) {
      if (p.test(c)) return true;
    }
  }
  return false;
}

/** オブジェクトの名前関連フィールドを sanitize する */
export function sanitizeRow<T extends Record<string, unknown>>(row: T): T {
  const target: Record<string, unknown> = { ...row };
  if (isRealName(target as { first_name?: unknown; last_name?: unknown })) {
    // 本人レコード検出 → 全名前フィールドを「YO」に
    target.first_name = 'YO';
    target.last_name = '';
    target.clone_display_name = 'YO';
    return target as T;
  }
  // 念のため個別フィールドも単体マッチでサニタイズ
  for (const key of ['first_name', 'last_name', 'clone_display_name']) {
    const v = target[key];
    if (typeof v === 'string') {
      target[key] = sanitizeRealName(v);
    }
  }
  return target as T;
}
