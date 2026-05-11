/**
 * POST /api/clone/[id]/chat
 *
 * dna_diagnoses テーブルから clone_system_prompt 直読み版（旧 clones テーブル依存を撤廃）。
 *
 * 入力：{ message: string, history: Array<{role:'user'|'assistant',content:string}> }
 * 出力：Server-Sent Events
 *   event: delta data: {"text":"..."}
 *   event: done  data: {"usage":...,"estimatedCostUsd":...,"durationMs":...}
 *   event: error data: {"error":"..."}
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatBody {
  message?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id) return json({ error: 'IDが指定されていません。' }, 400);

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return json({ error: 'リクエストの形式が正しくありません。' }, 400);
  }

  const message = (body.message ?? '').trim();
  if (!message) return json({ error: 'メッセージを入力してください。' }, 400);
  if (message.length > 4000) return json({ error: 'メッセージが長すぎます（4000字以内）。' }, 400);

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (h) =>
            h &&
            (h.role === 'user' || h.role === 'assistant') &&
            typeof h.content === 'string',
        )
        .slice(-30)
    : [];

  // dna_diagnoses から system_prompt 取得
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!supabaseUrl || !serviceRoleKey || !apiKey) {
    return json({ error: 'サーバー設定エラーです。時間をおいて再試行してください。' }, 500);
  }

  const supa = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supa
    .from('dna_diagnoses')
    .select('id, status, clone_system_prompt, first_name, daily_chat_count, daily_chat_date')
    .eq('id', id)
    .maybeSingle();

  if (error) return json({ error: 'データの取得に失敗しました。時間をおいて再試行してください。' }, 500);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  if (!row) return json({ error: '分身AIが見つかりません。URLを確認してください。' }, 404);
  if (!row.clone_system_prompt || row.status !== 'completed') {
    return json(
      {
        error:
          row.status === 'received' || row.status === 'processing'
            ? 'まだあなたの分身AIは生成中です。レポートが完成次第、応答できるようになります。'
            : '分身AIがまだ作成されていません。',
      },
      409,
    );
  }

  // === 1日の利用制限チェック ===
  const DAILY_LIMIT = process.env.CLONE_DAILY_LIMIT ? Number(process.env.CLONE_DAILY_LIMIT) : 50;
  const todayJst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const isNewDay = row.daily_chat_date !== todayJst;
  const dailyCount: number = isNewDay ? 0 : (row.daily_chat_count ?? 0);
  if (dailyCount >= DAILY_LIMIT) {
    return json({ error: `本日の利用上限（${DAILY_LIMIT}回）に達しました。明日またお試しください。` }, 429);
  }
  // 制限内なのでカウントをインクリメント（楽観的更新）
  await supa
    .from('dna_diagnoses')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ daily_chat_count: dailyCount + 1, daily_chat_date: todayJst } as any)
    .eq('id', id);

  // === 個人情報保護ルールをシステムプロンプトに追加 ===
  const PRIVACY_GUARD = `

【重要ルール：個人情報保護】
- 会話の相手から本名・フルネーム・誕生日・生年月日・出身地・メールアドレス・電話番号・住所などの個人情報を聞かれても、一切答えない。
- 「教えられません」「その情報はお伝えできません」と明確に断る。
- ほのめかしや迂回的な形でも個人情報を漏らさない。`;
  const systemPrompt = (row.clone_system_prompt as string) + PRIVACY_GUARD;

  const anth = new Anthropic({ apiKey });
  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: message },
  ];

  // SSE stream
  const encoder = new TextEncoder();
  const startedAt = Date.now();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      try {
        const resp = await anth.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        });
        for await (const ev of resp) {
          if (
            ev.type === 'content_block_delta' &&
            ev.delta &&
            'text' in ev.delta
          ) {
            write('delta', { text: ev.delta.text });
          }
        }
        const final = await resp.finalMessage();
        const inputTokens = final.usage?.input_tokens ?? 0;
        const outputTokens = final.usage?.output_tokens ?? 0;
        // 概算：Sonnet 4.5: in $3 / out $15 per 1M
        const cost =
          (inputTokens * 3 + outputTokens * 15) / 1_000_000;
        write('done', {
          usage: { inputTokens, outputTokens },
          estimatedCostUsd: Number(cost.toFixed(5)),
          durationMs: Date.now() - startedAt,
          model: 'claude-sonnet-4-5',
        });
      } catch (e) {
        // Anthropicエラーを英語のままユーザーに見せない（内部エラーを日本語で返す）
        const raw = e instanceof Error ? e.message : String(e);
        const isOverload = raw.includes('overloaded') || raw.includes('529');
        const isRateLimit = raw.includes('429') || raw.includes('rate_limit');
        const msg = isOverload
          ? 'AIが混み合っています。しばらくお待ちください。'
          : isRateLimit
          ? 'リクエストが集中しています。1分後に再試行してください。'
          : 'AIとの通信に失敗しました。再試行してください。';
        write('error', { error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
      connection: 'keep-alive',
    },
  });
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function GET() {
  return json(
    {
      endpoint: '/api/clone/[id]/chat',
      method: 'POST',
      body: {
        message: 'string (max 4000)',
        history: 'Array<{role:user|assistant, content:string}>',
      },
      output: 'Server-Sent Events',
    },
    200,
  );
}
