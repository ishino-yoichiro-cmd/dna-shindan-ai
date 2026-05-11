/**
 * DNA診断AI — Supabase Storage ヘルパー
 *
 * PDFレポート (約30ページ) のアップロード・公開URL生成・signed URL生成を担う。
 *
 * バケット規約:
 *   - reports : public 設定 (公開URLでユーザー配布)
 *     パス: reports/{diagnosis_id}.pdf
 *
 * 注: バケットは Supabase Studio もしくは migration で別途作成すること。
 *     SQL での作成例:
 *       insert into storage.buckets (id, name, public)
 *         values ('reports', 'reports', true)
 *         on conflict (id) do nothing;
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { getSupabaseServiceRoleClient } from './server';

export const REPORTS_BUCKET = 'reports' as const;

export interface UploadReportPdfParams {
  diagnosisId: string;
  pdfBuffer: ArrayBuffer | Uint8Array | Blob;
  upsert?: boolean;
}

export interface UploadReportPdfResult {
  storagePath: string;
  publicUrl: string;
}

/**
 * PDFレポートを Storage にアップロードし、公開URLとパスを返す。
 * service_role 必須。
 */
export async function uploadReportPdf(
  params: UploadReportPdfParams,
  client?: SupabaseClient<Database>,
): Promise<UploadReportPdfResult> {
  const supabase = client ?? getSupabaseServiceRoleClient();
  const path = `reports/${params.diagnosisId}.pdf`;

  // BlobPart の型ゆらぎ (ArrayBuffer / Uint8Array<ArrayBufferLike>) を吸収するため
  // 一度新しい Uint8Array に詰め直してから Blob 化する。
  const toBlob = (
    buf: ArrayBuffer | Uint8Array | Blob,
  ): Blob => {
    if (buf instanceof Blob) return buf;
    const u8 =
      buf instanceof Uint8Array ? new Uint8Array(buf) : new Uint8Array(buf);
    const ab = new ArrayBuffer(u8.byteLength);
    new Uint8Array(ab).set(u8);
    return new Blob([ab], { type: 'application/pdf' });
  };

  const body = toBlob(params.pdfBuffer);

  const { error } = await supabase.storage
    .from(REPORTS_BUCKET)
    .upload(path, body, {
      contentType: 'application/pdf',
      upsert: params.upsert ?? true,
    });

  if (error) {
    throw new Error(
      `[storage] PDFアップロード失敗 path=${path}: ${error.message}`,
    );
  }

  const { data: pub } = supabase.storage
    .from(REPORTS_BUCKET)
    .getPublicUrl(path);

  return {
    storagePath: path,
    publicUrl: pub.publicUrl,
  };
}

/**
 * 期限付き署名URL生成 (private バケットの場合用)。
 * デフォルト有効期限: 7日。
 */
export async function createSignedReportUrl(
  diagnosisId: string,
  expiresInSec: number = 60 * 60 * 24 * 7,
  client?: SupabaseClient<Database>,
): Promise<string> {
  const supabase = client ?? getSupabaseServiceRoleClient();
  const path = `reports/${diagnosisId}.pdf`;

  const { data, error } = await supabase.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(path, expiresInSec);

  if (error || !data?.signedUrl) {
    throw new Error(
      `[storage] 署名URL発行失敗 path=${path}: ${error?.message ?? 'unknown'}`,
    );
  }

  return data.signedUrl;
}

/**
 * PDFレポート削除 (再生成時のクリーンアップ用)。
 */
export async function deleteReportPdf(
  diagnosisId: string,
  client?: SupabaseClient<Database>,
): Promise<void> {
  const supabase = client ?? getSupabaseServiceRoleClient();
  const path = `reports/${diagnosisId}.pdf`;

  const { error } = await supabase.storage
    .from(REPORTS_BUCKET)
    .remove([path]);

  if (error) {
    throw new Error(
      `[storage] PDF削除失敗 path=${path}: ${error.message}`,
    );
  }
}
