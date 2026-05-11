/**
 * safe-zod.ts
 * Zod を使った API 入力検証ヘルパー（OWASP A03 / API3 / LLM05 対策）。
 *
 * 使い方（API ルート）：
 *
 *   import { z } from 'zod';
 *   import { parseBody, badRequest } from '@/_shared/lib/safe-zod';
 *
 *   const Schema = z.object({
 *     name: z.string().min(1).max(100),
 *     email: z.string().email(),
 *     age: z.number().int().min(0).max(150).optional(),
 *   }).strict();  // ← strict() で予期しないキーを拒否（mass assignment 防止）
 *
 *   export async function POST(req: Request) {
 *     const result = await parseBody(req, Schema);
 *     if (!result.ok) return result.response;
 *     const { name, email, age } = result.data;
 *     ...
 *   }
 */
import type { NextResponse } from 'next/server';

type ZodLike<T> = {
  safeParse: (data: unknown) =>
    | { success: true; data: T }
    | { success: false; error: { issues: Array<{ path: (string | number)[]; message: string }> } };
};

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

/**
 * Request.json() → Zod 検証。失敗時は日本語エラー JSON 400 を返す Response を作る。
 */
export async function parseBody<T>(req: Request, schema: ZodLike<T>): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: jsonError(400, '入力データの形式が不正です（JSON として解釈できません）'),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .slice(0, 5)
      .join(' / ');
    return {
      ok: false,
      response: jsonError(400, `入力検証エラー: ${issues}`),
    };
  }

  return { ok: true, data: result.data };
}

/**
 * クエリパラメータ検証。
 */
export function parseQuery<T>(url: URL, schema: ZodLike<T>): ParseResult<T> {
  const obj: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    obj[k] = v;
  });
  const result = schema.safeParse(obj);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .slice(0, 5)
      .join(' / ');
    return { ok: false, response: jsonError(400, `クエリ検証エラー: ${issues}`) };
  }
  return { ok: true, data: result.data };
}

export function jsonError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    { status, headers: { 'content-type': 'application/json; charset=utf-8' } }
  );
}

export function badRequest(message: string): Response {
  return jsonError(400, message);
}

export function unauthorized(message = '認証が必要です'): Response {
  return jsonError(401, message);
}

export function forbidden(message = 'アクセス権限がありません'): Response {
  return jsonError(403, message);
}

export function tooManyRequests(message = 'リクエストが多すぎます。少し時間を置いてから再度お試しください'): Response {
  return jsonError(429, message);
}

export function serverError(message = 'サーバ側でエラーが発生しました。少し時間を置いてから再度お試しください'): Response {
  return jsonError(500, message);
}
