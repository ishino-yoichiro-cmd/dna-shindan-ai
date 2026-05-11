/**
 * safe-upload.ts
 * ファイル upload の多重防御（OWASP V5・CWE-434）。
 *
 * 使い方：
 *   import { verifyUpload } from '@/_shared/lib/safe-upload';
 *   const file = await verifyUpload(uploadedBlob, {
 *     maxSizeBytes: 5 * 1024 * 1024,
 *     allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
 *     allowedExts: ['.jpg', '.jpeg', '.png', '.webp'],
 *   });
 */
import { assertExtension, assertFilenameOnly, PathTraversalError } from './safe-path';

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

export interface UploadConstraints {
  maxSizeBytes: number;
  allowedMimes: string[];
  allowedExts: string[];
}

/**
 * Magic byte (file signature) → MIME 推定。
 * 小さく汎用的な subset のみ。本格的には `file-type` ライブラリ推奨。
 */
function detectMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;
  const hex = Array.from(bytes.slice(0, 12))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // JPEG
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  // PNG
  if (hex.startsWith('89504e47')) return 'image/png';
  // GIF
  if (hex.startsWith('474946383761') || hex.startsWith('474946383961')) return 'image/gif';
  // WebP
  if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') return 'image/webp';
  // PDF
  if (hex.startsWith('25504446')) return 'application/pdf';
  // SVG / XML（テキスト検査）
  const text = new TextDecoder().decode(bytes.slice(0, 256));
  if (/^<\?xml|^<svg/i.test(text)) return 'image/svg+xml';
  return null;
}

export interface VerifiedUpload {
  buffer: Uint8Array;
  filename: string;
  mime: string;
  size: number;
}

export async function verifyUpload(
  file: { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer>; type?: string },
  constraints: UploadConstraints
): Promise<VerifiedUpload> {
  // 1. ファイル名検証
  try {
    assertFilenameOnly(file.name);
    assertExtension(file.name, constraints.allowedExts);
  } catch (e) {
    if (e instanceof PathTraversalError) {
      throw new UploadValidationError(e.message);
    }
    throw e;
  }

  // 2. サイズ検証
  if (file.size <= 0) {
    throw new UploadValidationError('ファイルが空です');
  }
  if (file.size > constraints.maxSizeBytes) {
    const limitMB = (constraints.maxSizeBytes / 1024 / 1024).toFixed(1);
    throw new UploadValidationError(`ファイルサイズが上限（${limitMB}MB）を超えています`);
  }

  // 3. 中身読込
  const buf = new Uint8Array(await file.arrayBuffer());
  if (buf.byteLength !== file.size) {
    throw new UploadValidationError('ファイルサイズが不整合です');
  }

  // 4. Magic byte 検証
  const detected = detectMimeFromBytes(buf);
  if (!detected) {
    throw new UploadValidationError('ファイル形式を判別できませんでした');
  }

  // SVG は XSS リスクが高いので明示禁止
  if (detected === 'image/svg+xml') {
    throw new UploadValidationError('SVG ファイルはアップロードできません（XSS 防止）');
  }

  // 5. クライアント申告 MIME と magic byte の一致確認
  if (file.type && file.type !== detected) {
    throw new UploadValidationError(
      `ファイルの種類が一致しません（申告: ${file.type} / 実体: ${detected}）`
    );
  }

  // 6. allowlist 検証
  if (!constraints.allowedMimes.includes(detected)) {
    throw new UploadValidationError(`許可されていないファイル形式です: ${detected}`);
  }

  return {
    buffer: buf,
    filename: file.name,
    mime: detected,
    size: file.size,
  };
}
