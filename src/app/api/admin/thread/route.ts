// GET /api/admin/thread?pass=...&email=relayed@example.com
//
// 指定アドレスとの「送受信履歴」を時系列で返す。
// 送信側: email_send_log.details(jsonb) を当該メールで部分一致
// 受信側: クライアント側で受信ボックスの一覧から該当アドレスを抽出（コスト節約のため IMAP は叩かない）

import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function verifyPass(pass: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD ?? '';
  if (!adminPass) return false;
  return pass === adminPass;
}

export interface ThreadEntry {
  kind: 'sent' | 'received';
  at: string;
  subject: string;
  bodyPreview: string;
  email: string;
  meta?: Record<string, unknown>;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pass = url.searchParams.get('pass') ?? '';
  const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
  if (!verifyPass(pass)) {
    return Response.json({ ok: false, error: '認証失敗' }, { status: 401 });
  }
  if (!email) {
    return Response.json({ ok: false, error: 'email パラメータが必要' }, { status: 400 });
  }

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) {
    return Response.json({ ok: false, error: 'Supabase 環境変数未設定' }, { status: 500 });
  }
  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // details(jsonb) は配列 [{ email, ok, error? }, ...]
  // jsonb @> '[{"email":"xxx"}]' で部分一致
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = (supa as any)
    .from('email_send_log')
    .select('id, created_at, subject, to_type, sent, failed, total, body_preview, details')
    .filter('details', 'cs', JSON.stringify([{ email }]))
    .order('created_at', { ascending: false })
    .limit(50);

  const { data, error } = await q;
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const entries: ThreadEntry[] = (data ?? []).map((row: {
    id: string; created_at: string; subject: string; to_type: string;
    sent: number; failed: number; total: number; body_preview?: string;
    details?: Array<{ email: string; ok: boolean; error?: string; inReplyTo?: string | null }>;
  }) => {
    const matched = row.details?.find(d => (d.email ?? '').toLowerCase() === email);
    return {
      kind: 'sent' as const,
      at: row.created_at,
      subject: row.subject ?? '(件名なし)',
      bodyPreview: row.body_preview ?? '',
      email,
      meta: {
        logId: row.id,
        toType: row.to_type,
        ok: matched?.ok ?? null,
        error: matched?.error ?? null,
        sent: row.sent,
        failed: row.failed,
        total: row.total,
      },
    };
  });

  return Response.json({ ok: true, email, entries });
}
