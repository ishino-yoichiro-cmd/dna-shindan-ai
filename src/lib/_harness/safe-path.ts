/**
 * safe-path.ts
 * Path Traversal 攻撃（CWE-22）対策ヘルパー。
 *
 * 使い方：
 *   import { safeJoin } from '@/_shared/lib/safe-path';
 *   const filePath = safeJoin(UPLOADS_DIR, userInput.filename);  // 安全
 */
import path from 'node:path';

export class PathTraversalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathTraversalError';
  }
}

/**
 * baseDir 配下に限定した安全な join。
 * userPath が '../' や絶対パスで baseDir を脱出しようとしたら throw。
 */
export function safeJoin(baseDir: string, userPath: string): string {
  if (typeof userPath !== 'string' || userPath.length === 0) {
    throw new PathTraversalError('ファイルパスが空です');
  }
  // null byte 攻撃ブロック
  if (userPath.includes('\0')) {
    throw new PathTraversalError('ファイルパスに不正な文字が含まれています');
  }
  // 絶対パス禁止
  if (path.isAbsolute(userPath)) {
    throw new PathTraversalError('絶対パスは指定できません');
  }
  const baseAbs = path.resolve(baseDir);
  const joined = path.resolve(baseAbs, userPath);
  // baseDir 配下にあるか
  const rel = path.relative(baseAbs, joined);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new PathTraversalError('指定された場所にはアクセスできません');
  }
  return joined;
}

/**
 * ファイル名のみを許可（slash 含む path 拒否）。
 */
export function assertFilenameOnly(filename: string): void {
  if (typeof filename !== 'string' || filename.length === 0) {
    throw new PathTraversalError('ファイル名が空です');
  }
  if (/[\/\\\0]/.test(filename)) {
    throw new PathTraversalError('ファイル名にスラッシュ・バックスラッシュは使えません');
  }
  if (filename === '.' || filename === '..') {
    throw new PathTraversalError('無効なファイル名です');
  }
}

/**
 * 拡張子 allowlist 検証。
 */
export function assertExtension(filename: string, allowed: string[]): void {
  const ext = path.extname(filename).toLowerCase();
  const allowedLower = allowed.map((a) => (a.startsWith('.') ? a.toLowerCase() : `.${a.toLowerCase()}`));
  if (!allowedLower.includes(ext)) {
    throw new PathTraversalError(`許可されていない拡張子です: ${ext}`);
  }
}
