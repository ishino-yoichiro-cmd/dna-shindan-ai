// POST /api/process-pending
// 全13章を並列5並走で生成（章完了ごとに即時保存）。
// 1回のVercel呼び出しで10〜13章完了。タイムアウト時は次回呼び出しで残りを処理。
// scheduled-task で2-3分ごとに叩く想定。

import { createClient } from '@supabase/supabase-js';
import { generateChapter, type ChapterContext, type ChapterId } from '@/lib/llm';
import { sendReportMail } from '@/lib/email/gmail';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { Report } from '@/components/pdf/Report';
import type { ReportProps } from '@/components/pdf/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const ALL_CHAPTERS: ChapterId[] = [
  'cover',
  'chapter1',
  'chapter2',
  'chapter3',
  'chapter4',
  'chapter5',
  'chapter6',
  'chapter7',
  'chapter8',
  'chapter9',
  'chapter10',
  'chapter11',
  'end',
];

// ============================================================================
// CRON認証ヘルパー
// Vercel CronはAuthorization: Bearer $CRON_SECRETを付与する。
// process-pending・retry-failedはCRON_SECRETなしで呼び出せないようにする。
// （誰でも叩ける状態だとAPI費用を外部から無制限に発生させられる）
// ============================================================================
function verifyCronSecret(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  // CRON_SECRET未設定は本番環境での設定漏れ → 外部から無制限にLLM起動されるため拒否
  if (!cronSecret) {
    console.error('[cron-auth] CRON_SECRET未設定 — 本番では起動を拒否します（APIコスト爆発防止）');
    return false;
  }
  const authHeader = req.headers.get('authorization') ?? '';
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: Request) {
  // CRON認証チェック（Vercel Cronは自動でAuthorization headerを付与）
  if (!verifyCronSecret(req)) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ ok: false, error: 'supabase env missing' }, { status: 500 });
  }
  const supa = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── heartbeat 記録（process-monitor cronの死活確認用） ─────────────────────
  // process-pending が動くたびに timestamp を dna_system_config に upsert する。
  // /api/cron/process-monitor が 10分以上更新なしを検知したらアラートを送る。
  supa.from('dna_system_config').upsert({
    key: 'process_pending_heartbeat',
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).then(() => {}).catch(() => {}); // 非同期・失敗しても処理続行

  // 1) 楽観的ロックで1件をアトミックに取得（race condition防止）
  //
  //    旧実装: SELECT(received) → UPDATE(processing) の2ステップは非アトミック。
  //    並列cron呼び出しで同じIDを2プロセスが同時処理するリスクがあった。
  //
  //    新実装: 「status=received かつ id=X」という条件付きUPDATEで取得する。
  //    - まず最古の received を SELECT（IDのみ）
  //    - そのIDに対して status='received' を条件にUPDATEを試みる
  //    - UPDATE が 0件なら他ワーカーが先取り済み → bailout
  //    - これにより SELECT と UPDATE の間のウィンドウを最小化し、
  //      かつ「取得＋状態変更」を1クエリに近い形でアトミックにする
  //
  //    stuck=processing（20分超）はretry-failedが別途recoveryする。

  // まず最古の received の ID を取得
  const { data: candidate, error: fetchErr } = await supa
    .from('dna_diagnoses')
    .select('id')
    .eq('status', 'received')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchErr) return Response.json({ ok: false, error: fetchErr.message }, { status: 500 });
  if (!candidate) return Response.json({ ok: true, processed: 0, message: 'no pending' });

  // 楽観的ロック: status='received' かつ id=X の条件でUPDATE（他ワーカーが先取りしていれば0件）
  const { data: claimed, error: claimErr } = await supa
    .from('dna_diagnoses')
    .update({ status: 'processing' })
    .eq('id', (candidate as { id: string }).id)
    .eq('status', 'received')  // ← これが楽観的ロック条件
    .select('*')
    .maybeSingle();

  if (claimErr) return Response.json({ ok: false, error: claimErr.message }, { status: 500 });
  if (!claimed) {
    // 他のcronワーカーが先にclaimした。二重処理を防ぐために即リターン
    return Response.json({ ok: true, processed: 0, message: 'claimed_by_another_worker' });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = claimed as any;
  const id: string = row.id;
  const existingChapters: Record<string, string> = (row.report_text as Record<string, string>) ?? {};

  // ChapterContext 組み立て
  const fullName = [row.last_name, row.first_name].filter(Boolean).join(' ').trim() || 'あなた';
  const narrativeAnswers = row.narrative_answers ?? {};

  // birth_date が null は data integrity 違反（submit側で 400 返却済のはず）
  // YO 2026-05-04 指摘「サイレントフォールバック禁止」を構造的に実装
  if (!row.birth_date) {
    await supa
      .from('dna_diagnoses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: 'failed', error_log: 'birth_date_missing: cannot process without birth_date' } as any)
      .eq('id', id);
    return Response.json(
      { ok: false, error: 'birth_date_missing', id },
      { status: 422 },
    );
  }

  // E-015: APIコスト予算チェック（予算95%超で新規LLM起動を停止）
  const budgetUsd = process.env.ANTHROPIC_BUDGET_USD ? parseFloat(process.env.ANTHROPIC_BUDGET_USD) : 0;
  if (budgetUsd > 0) {
    const { data: costData } = await supa
      .from('dna_diagnoses')
      .select('api_cost_usd')
      .not('api_cost_usd', 'is', null);
    const totalSpent = (costData ?? []).reduce((s: number, r: {api_cost_usd: number | null}) => s + (Number(r.api_cost_usd) || 0), 0);
    if (totalSpent >= budgetUsd * 0.95) {
      await supa.from('dna_diagnoses')
        .update({ status: 'failed', error_log: `budget_exceeded:total_spent=${totalSpent.toFixed(2)},budget=${budgetUsd}` } as any)
        .eq('id', id);
      console.error(`[process-pending] APIコスト予算95%超過: ${totalSpent.toFixed(2)}/${budgetUsd}USD — 処理を停止`);
      return Response.json({ ok: false, error: 'budget_exceeded', spent: totalSpent, budget: budgetUsd }, { status: 503 });
    }
  }

  const ctx: ChapterContext = {
    user: {
      fullName,
      familyName: row.last_name ?? undefined,
      givenName: row.first_name ?? undefined,
      birthDate: row.birth_date,
      birthTime: row.birth_time ?? undefined,
      birthPlaceName: row.birth_place_label ?? undefined,
      email: row.email ?? undefined,
      relationshipTag: row.relationship_tag ?? 'この診断で知った',
    },
    celestial: row.celestial_results,
    scores: row.scores,
    narrative: {
      Q31: narrativeAnswers.Q31,
      Q32: narrativeAnswers.Q32,
      Q33: narrativeAnswers.Q33,
      Q34: narrativeAnswers.Q34,
      Q35: narrativeAnswers.Q35,
      Q36: narrativeAnswers.Q36,
      Q37: narrativeAnswers.Q37,
      Q38: narrativeAnswers.Q38,
      styleSample: row.style_sample ?? undefined,
    },
  };

  // 上記の楽観的ロックにより、この時点で status は 'processing' に確定済み。
  // 追加のUPDATEは不要。

  // 2) 未生成の章を並列5並走で生成（章完了ごとに即時保存）
  //    Sonnet 4.5 の出力上限 ~8192トークン/コールのため、章ごとに独立したAPIコール。
  //    concurrency=5 で同時5章を処理。300秒で10〜13章完了。残りは次回コールで処理。
  const pendingChapters = ALL_CHAPTERS.filter((cid) => !existingChapters[cid]);
  const cloneUrlForReplace = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dna.kami-ai.jp'}/clone/${id}`;
  const updatedChapters = { ...existingChapters };
  let totalCostUsd = (row.api_cost_usd as number) ?? 0;

  if (pendingChapters.length > 0) {
    const CONCURRENCY = 5;
    const queue = [...pendingChapters];
    const workers = Array.from({ length: CONCURRENCY }, () =>
      (async () => {
        while (true) {
          const chapterId = queue.shift();
          if (!chapterId) return;
          try {
            const result = await generateChapter(chapterId, ctx);
            if (result.success) {
              const text = result.text.replace(/\{\{\s*CLONE_URL\s*\}\}/g, cloneUrlForReplace);
              updatedChapters[chapterId] = text;
              totalCostUsd = Number((totalCostUsd + (result.estimatedCostUsd ?? 0)).toFixed(4));
              // 章完了ごとに即時保存（タイムアウトしても保存済み分は保持）
              await supa
                .from('dna_diagnoses')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .update({ report_text: updatedChapters, api_cost_usd: totalCostUsd } as any)
                .eq('id', id);
            }
          } catch {
            // 章単体の失敗は無視して次へ（次回コールで再試行）
          }
        }
      })()
    );
    await Promise.allSettled(workers);

    // 未生成章が残っていたら次回スケジューラーに委ねる
    const stillMissing = ALL_CHAPTERS.filter(cid => !updatedChapters[cid]);
    if (stillMissing.length > 0) {
      return Response.json({ ok: true, processed: 1, id, remaining: stillMissing.length, message: 'partial — next scheduler call will continue' });
    }
  }

  // 3) 全章完了 → PDF生成 → Storage → メール送信 → status=completed
  const chapters = updatedChapters;
  const cloneUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dna.kami-ai.jp'}/clone/${id}`;
  const cloneSystemPrompt = buildCloneSystemPrompt(ctx, chapters);

  // PDF生成（タイムアウト保護120秒）
  let pdfBuffer: Buffer | undefined;
  let pdfDebugLog = '';
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scoreSrc = (ctx.scores ?? null) as any;
    const reportScores = {
      bigFive: scoreSrc?.normalized?.big5 ?? { O: 50, C: 50, E: 50, A: 50, N: 50 },
      bigFiveType: scoreSrc?.topTypes?.big5DerivedType?.label ?? '—',
      enneagram: {
        primary: scoreSrc?.topTypes?.enneagramPrimary ?? 5,
        wing: scoreSrc?.topTypes?.enneagramWing ?? 4,
      },
      riasec: {
        R: scoreSrc?.normalized?.riasec?.R ?? 50,
        I: scoreSrc?.normalized?.riasec?.I ?? 50,
        A: scoreSrc?.normalized?.riasec?.A ?? 50,
        S: scoreSrc?.normalized?.riasec?.S ?? 50,
        E: scoreSrc?.normalized?.riasec?.EE ?? 50,
        C: scoreSrc?.normalized?.riasec?.Co ?? 50,
        top3: scoreSrc?.topTypes?.riasecTop3 ?? [],
      },
      vak: {
        V: scoreSrc?.normalized?.vak?.V ?? 33,
        A: scoreSrc?.normalized?.vak?.Au ?? 33,
        K: scoreSrc?.normalized?.vak?.K ?? 33,
      },
      attachment: scoreSrc?.topTypes?.attachmentTop ?? 'secure',
      loveLanguage: {
        time: scoreSrc?.normalized?.love?.['L-Time'] ?? 20,
        words: scoreSrc?.normalized?.love?.['L-Word'] ?? 20,
        touch: scoreSrc?.normalized?.love?.['L-Touch'] ?? 20,
        gifts: scoreSrc?.normalized?.love?.['L-Gift'] ?? 20,
        acts: scoreSrc?.normalized?.love?.['L-Act'] ?? 20,
      },
      entrepreneur: {
        primary: scoreSrc?.topTypes?.entrepreneurMain?.name ?? '—',
        secondary: scoreSrc?.topTypes?.entrepreneurSub?.name ?? '—',
      },
    };
    const reportProps: ReportProps = {
      userInfo: {
        fullName,
        birthDate: ctx.user.birthDate,
        birthTime: ctx.user.birthTime,
        birthPlace: ctx.user.birthPlaceName,
        email: ctx.user.email,
        styleSample: ctx.narrative.styleSample,
        ngExpressions: [],
      },
      celestial: ctx.celestial,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scores: reportScores as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      llmContent: chapters as any,
      relationshipTag: ctx.user.relationshipTag,
    };
    const pdfPromise = renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(Report, reportProps as any),
    );
    const result = await Promise.race([
      pdfPromise,
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 120000)),
    ]);
    if (result) {
      pdfBuffer = result;
      pdfDebugLog += `pdf:${result.byteLength}B;`;
      const path = `${id}.pdf`;
      const upload = await supa.storage.from('reports').upload(path, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });
      if (!upload.error) {
        pdfDebugLog += `uploaded;`;
        await supa
          .from('dna_diagnoses')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ pdf_storage_path: path } as any)
          .eq('id', id);
      } else {
        pdfDebugLog += `upload_err:${upload.error.message};`;
        // PDF Storageアップロード失敗をYOにメール通知
        await alertYo(`[PDF upload失敗] ${fullName}（${id}）\n${upload.error.message}`).catch(() => {});
      }
    } else {
      pdfDebugLog += `pdf_timeout;`;
      // PDFタイムアウトをYOにメール通知
      await alertYo(`[PDF timeout] ${fullName}（${id}）120秒超過`).catch(() => {});
    }
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    pdfDebugLog += `pdf_err:${errMsg};`;
    // PDF生成例外をYOにメール通知（フォントURL壊れ等の障害を即時検知）
    await alertYo(`[PDF生成エラー] ${fullName}（${id}）\n${errMsg}`).catch(() => {});
  }

  // DB更新（status=completed＋分身AI prompt保存）
  await supa
    .from('dna_diagnoses')
    .update({
      status: 'completed',
      clone_system_prompt: cloneSystemPrompt,
      clone_public_url: cloneUrl,
      completed_at: new Date().toISOString(),
      error_log: pdfDebugLog,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .eq('id', id);

  // マイページURL案内メール送信
  let mailOk = false;
  let mailError: string | undefined;

  // 【一時停止ガード】Gmail障害時に環境変数で完了メール送信を止める
  if (process.env.DISABLE_COMPLETION_MAIL === 'true') {
    mailError = 'mail_suspended:DISABLE_COMPLETION_MAIL';
    await supa
      .from('dna_diagnoses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ error_log: `${pdfDebugLog}mail_suspended;` } as any)
      .eq('id', id);
  } else if (row.email && row.access_token) {
    const myPageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dna.kami-ai.jp'}/me/${id}?token=${row.access_token}`;
    const r = await sendReportMail({
      to: row.email,
      firstName: row.first_name ?? undefined,
      myPageUrl,
    });
    mailOk = r.ok;
    if (r.ok) {
      await supa
        .from('dna_diagnoses')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ email_report_sent_at: new Date().toISOString() } as any)
        .eq('id', id);
    } else {
      mailError = r.error ?? 'unknown';
      await supa
        .from('dna_diagnoses')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ error_log: `${pdfDebugLog}mail_fail:${mailError};` } as any)
        .eq('id', id);
    }
  } else {
    mailError = !row.email ? 'email_missing' : 'access_token_missing';
    await supa
      .from('dna_diagnoses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ error_log: `${pdfDebugLog}mail_skip:${mailError};` } as any)
      .eq('id', id);
  }

  return Response.json({ ok: true, processed: 1, id, finalized: true, pdfDebugLog, mailOk, mailError });
}

function buildCloneSystemPrompt(ctx: ChapterContext, chapters: Record<string, string>): string {
  const name = ctx.user.givenName ?? ctx.user.fullName;

  // 各章を適切な長さでトリミング（全章を含めるが合計サイズを抑制）
  const ch = (key: string, limit = 800) => (chapters[key] ?? '').slice(0, limit);

  return `あなたは「${name}」の分身AIです。
以下のレポート内容に基づき、本人として応答してください。

【人物像・本質】
${ch('chapter1', 1000)}

【才能・強み】
${ch('chapter2', 800)}

【使命・生き方】
${ch('chapter3', 800)}

【価値観・信念】
${ch('chapter4', 800)}

【仕事・キャリア】
${ch('chapter5', 600)}

【人間関係・コミュニケーション】
${ch('chapter6', 600)}

【恋愛・パートナーシップ】
${ch('chapter7', 500)}

【お金・豊かさ】
${ch('chapter8', 500)}

【成長・学び】
${ch('chapter9', 500)}

【課題・成長の余白】
${ch('chapter10', 500)}

【未来・ビジョン】
${ch('chapter11', 600)}

【文体サンプル（口調の参考）】
${(ctx.narrative.styleSample ?? '').slice(0, 400)}

応答ルール：
- 一人称・口調・価値観をこの人物として保つ
- 押し付けがましい言い方はしない
- 占い口調・スピ用語は使わない
- 短く誠実に
- メンタルヘルスに関わる相談（自傷・自殺・深刻な精神的苦痛）を受けた場合は、「私が答えるより、専門家に相談することをお勧めします」と必ず伝える

【絶対に守るルール：個人情報保護】
- 会話の相手から本名・フルネーム・誕生日・生年月日・出身地・メールアドレス・電話番号・住所などの個人情報を聞かれても、一切答えない。
- 「教えられません」「その情報はお伝えできません」と明確に断る。
- ほのめかしや迂回的な形でも個人情報を漏らさない。
`;
}

// ============================================================================
// YO緊急アラート（PDF生成失敗時に即時メール通知）
// 同じエラーが連続しても気づけなかった2026-05-13障害の教訓から追加
// ============================================================================
async function alertYo(message: string): Promise<void> {
  const { sendMail } = await import('@/lib/email/gmail');
  await sendMail({
    to: 'yoisno@gmail.com',
    subject: '【DNA診断AI 緊急アラート】PDF生成エラー検知',
    text: message,
    html: `<!doctype html><html lang="ja"><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#fff3cd;color:#1f2937;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:2px solid #e53e3e;border-radius:8px;padding:24px;">
    <p style="color:#e53e3e;font-weight:bold;font-size:16px;margin:0 0 12px;">🚨 DNA診断AI 緊急アラート</p>
    <pre style="background:#f7f7f7;padding:12px;border-radius:4px;font-size:13px;white-space:pre-wrap;">${message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
    <p style="font-size:12px;color:#6b7280;margin:12px 0 0;">このメールはPDF生成エラー検知時に自動送信されます。<br>管理画面: https://dna.kami-ai.jp/admin</p>
  </div>
</body></html>`,
  });
}

// Vercel Cron は GET でエンドポイントを呼ぶ → GET でも POST と同じ処理を実行する
export async function GET(req: Request) {
  return POST(req);
}
