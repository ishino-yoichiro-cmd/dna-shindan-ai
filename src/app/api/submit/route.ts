// POST /api/submit
// 診断データを受け取り、命術計算→スコアリング→Supabase INSERT→受領通知メール送信
// LLM レポート生成・PDF生成・分身ボット作成は /api/process-pending で非同期実行

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runAllCelestial } from '@/lib/celestial';
import { runScoring } from '@/lib/scoring';
import { sendReceiptMail } from '@/lib/email/gmail';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ============================================================================
// 入力サイズ上限（バジェット保護・タイムアウト防止）
// ============================================================================
const MAX_NARRATIVE_CHARS = 3000;  // 1回答あたり最大3000字
const MAX_STYLE_SAMPLE_CHARS = 5000;  // 文体サンプル最大5000字
const MAX_NAME_CHARS = 50;            // 氏名最大50字

// ============================================================================
// 簡易レート制限（Supabase使用・メール重複チェック）
//
// NOTE: IPベースのレート制限は dna_diagnoses.client_ip カラムが必要。
//       カラムが未追加の場合はメールベースのみで動作する。
//       Supabase Dashboard → Table Editor → dna_diagnoses に
//       client_ip TEXT カラムを手動追加すると IP制限も有効化される。
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkRateLimit(
  supa: ReturnType<typeof createClient<any>>,
  ip: string,
  email: string | undefined,
): Promise<{ blocked: boolean; reason?: string }> {
  // 同一メールで24時間以内に完了/処理中の診断がある場合は重複防止
  if (email) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: emailCount } = await supa
      .from('dna_diagnoses')
      .select('id', { count: 'exact', head: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('email', email as any)
      .not('status', 'eq', 'failed')
      .gte('created_at', oneDayAgo);
    if ((emailCount ?? 0) >= 2) {
      return { blocked: true, reason: 'このメールアドレスでは24時間以内に2回まで診断を受け付けています。時間をおいてから再試行してください。' };
    }
  }

  // IPベースのレート制限（client_ipカラムが存在する場合のみ動作）
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: ipCount, error: ipErr } = await supa
      .from('dna_diagnoses')
      .select('id', { count: 'exact', head: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('client_ip', ip as any)
      .gte('created_at', oneHourAgo);
    if (!ipErr && (ipCount ?? 0) >= 5) {
      return { blocked: true, reason: '同一IPから1時間に5回まで診断を受け付けています。しばらくしてから再試行してください。' };
    }
  } catch {
    // client_ip カラム未追加の場合は無視（IP制限はスキップ）
  }

  return { blocked: false };
}


interface SubmitBody {
  userInfo?: {
    lastName?: string;
    firstName?: string;
    email?: string;
    birthDate?: string;
    birthTime?: string;
    birthTimeUnknown?: boolean;
    birthPlaceLabel?: string;
    birthPlaceLatitude?: number;
    birthPlaceLongitude?: number;
    birthPlaceUnknown?: boolean;
  };
  relationshipTag?: string;
  selectAnswers?: Record<string, string>;
  narrativeAnswers?: Record<string, string>;
  styleSample?: string;
  scoreSnapshot?: unknown;
  submittedAt?: string;
}

export async function POST(req: NextRequest) {
  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const userInfo = body.userInfo ?? {};
  const email = userInfo.email?.trim();

  // ── 入力サイズ検証（バジェット保護・API費用暴走防止）──
  if (userInfo.firstName && userInfo.firstName.length > MAX_NAME_CHARS) {
    return Response.json({ ok: false, error: 'name_too_long', message: '名前が長すぎます（50字以内）' }, { status: 400 });
  }
  if (userInfo.lastName && userInfo.lastName.length > MAX_NAME_CHARS) {
    return Response.json({ ok: false, error: 'name_too_long', message: '名前が長すぎます（50字以内）' }, { status: 400 });
  }
  if (body.styleSample && body.styleSample.length > MAX_STYLE_SAMPLE_CHARS) {
    return Response.json({ ok: false, error: 'style_sample_too_long', message: '文体サンプルが長すぎます（5000字以内）' }, { status: 400 });
  }
  if (body.narrativeAnswers) {
    for (const [key, val] of Object.entries(body.narrativeAnswers)) {
      if (typeof val === 'string' && val.length > MAX_NARRATIVE_CHARS) {
        return Response.json({ ok: false, error: `narrative_too_long`, message: `${key}の回答が長すぎます（3000字以内）` }, { status: 400 });
      }
    }
  }

  // メールアドレス形式チェック
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: 'invalid_email', message: '正しいメールアドレスを入力してください。' }, { status: 400 });
  }

  // 必須項目チェック：生年月日が無いまま命術計算するとデータ破壊・誤レポート生成のリスク
  // YO 2026-05-04 指摘「サイレントフォールバック禁止」を構造的に実装
  if (!userInfo.birthDate) {
    return Response.json(
      { ok: false, error: 'birth_date_required', message: '生年月日が未入力です。診断画面に戻って入力してください。' },
      { status: 400 },
    );
  }

  // 1) 命術計算（fail safe: 失敗してもINSERTは続行）
  let celestial: unknown = null;
  try {
    const fullName = [userInfo.lastName, userInfo.firstName].filter(Boolean).join(' ').trim();
    celestial = await runAllCelestial({
      fullName: fullName || undefined,
      birthDate: userInfo.birthDate,
      birthTime: userInfo.birthTimeUnknown ? undefined : userInfo.birthTime,
      birthPlace:
        userInfo.birthPlaceUnknown ||
        userInfo.birthPlaceLatitude == null ||
        userInfo.birthPlaceLongitude == null
          ? undefined
          : {
              latitude: userInfo.birthPlaceLatitude,
              longitude: userInfo.birthPlaceLongitude,
              timezone: 'Asia/Tokyo',
            },
    });
  } catch (e) {
    console.error('[submit] celestial error', e);
  }

  // 2) スコアリング
  let scores: unknown = body.scoreSnapshot ?? null;
  if (!scores && body.selectAnswers) {
    try {
      scores = runScoring(body.selectAnswers);
    } catch (e) {
      console.error('[submit] scoring error', e);
    }
  }

  // 3) Supabase INSERT
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let diagnosisId: string | null = null;

  if (supabaseUrl && serviceRoleKey) {
    try {
      const supa = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // ── レート制限チェック（スパム・コスト爆発防止）──
      const clientIp =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        'unknown';
      const rateCheck = await checkRateLimit(supa, clientIp, email);
      if (rateCheck.blocked) {
        return Response.json(
          { ok: false, error: 'rate_limited', message: rateCheck.reason ?? '送信回数の上限を超えました。しばらく待ってから再試行してください。' },
          { status: 429 },
        );
      }

      const insertRow = {
        status: 'received',
        // access_tokenはアプリ層で必ず生成する（DB DEFAULT未設定時のフォールバック兼ねる）
        // マイページURLの認証トークン・メール通知URLに使用するため必須
        access_token: crypto.randomUUID(),
        email: email ?? null,
        first_name: userInfo.firstName ?? null,
        last_name: userInfo.lastName ?? null,
        birth_date: userInfo.birthDate ?? null,
        birth_time: userInfo.birthTimeUnknown ? null : (userInfo.birthTime ?? null),
        birth_place_label: userInfo.birthPlaceUnknown ? null : (userInfo.birthPlaceLabel ?? null),
        birth_place_lat: userInfo.birthPlaceUnknown ? null : (userInfo.birthPlaceLatitude ?? null),
        birth_place_lng: userInfo.birthPlaceUnknown ? null : (userInfo.birthPlaceLongitude ?? null),
        relationship_tag: body.relationshipTag ?? null,
        select_answers: body.selectAnswers ?? null,
        narrative_answers: body.narrativeAnswers ?? null,
        style_sample: body.styleSample ?? null,
        celestial_results: celestial,
        scores,
        client_ip: clientIp,
      };
      const { data, error } = await supa
        .from('dna_diagnoses')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(insertRow as any)
        .select('id')
        .single();
      if (error) {
        console.error('[submit] supabase insert error', error);
      } else {
        diagnosisId = (data as { id: string } | null)?.id ?? null;
        console.log('[submit] inserted', diagnosisId);
      }
    } catch (e) {
      console.error('[submit] supabase exception', e);
    }

    // DB INSERTに失敗した場合はエラーを返す（diagnosisIdがnullのままだとレポートが永遠に届かない）
    if (diagnosisId === null) {
      return Response.json(
        {
          ok: false,
          error: 'db_insert_failed',
          message: '送信に失敗しました。時間をおいて再試行してください。問題が続く場合はお問い合わせください。',
        },
        { status: 500 },
      );
    }
  } else {
    console.warn('[submit] supabase env missing, skipping insert');
  }

  // 4) 受領通知メール（Gmail SMTP・必須通知）
  let mailReceiptOk = false;
  let mailError: string | undefined;
  if (email) {
    try {
      const r = await sendReceiptMail({ to: email, firstName: userInfo.firstName });
      mailReceiptOk = r.ok;
      if (!r.ok) mailError = r.error;
      // email_received_at記録（INSERT成功時のみ）
      if (diagnosisId && r.ok && supabaseUrl && serviceRoleKey) {
        const supa = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        await supa
          .from('dna_diagnoses')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ email_received_at: new Date().toISOString() } as any)
          .eq('id', diagnosisId);
      }
    } catch (e) {
      mailError = e instanceof Error ? e.message : String(e);
      console.error('[submit] receipt mail error', e);
    }
  }

  // 5) YOへの転送（管理者通知）
  if (email) {
    try {
      const { sendMail } = await import('@/lib/email/gmail');
      await sendMail({
        to: 'yoisno@gmail.com',
        subject: `[DNA診断AI] 新規受領 ${diagnosisId ?? '(no-id)'} ${userInfo.firstName ?? ''}`,
        text: `Diagnosis ID: ${diagnosisId}
Email: ${email}
Name: ${userInfo.lastName ?? ''} ${userInfo.firstName ?? ''}
Birth: ${userInfo.birthDate} ${userInfo.birthTime ?? ''}
Place: ${userInfo.birthPlaceLabel ?? ''}
Relation: ${body.relationshipTag ?? ''}
Receipt mail: ${mailReceiptOk ? 'OK' : 'FAIL'} ${mailError ?? ''}
`,
      });
    } catch (e) {
      console.error('[submit] admin mail error', e);
    }
  }

  return Response.json(
    {
      ok: true,
      diagnosisId,
      mailReceiptOk,
      mailError,
      message: '診断データを受け取りました。30分〜1時間以内にレポートをお送りします。',
    },
    { status: 200 },
  );
}

export async function GET() {
  return Response.json({
    endpoint: '/api/submit',
    method: 'POST',
  });
}
