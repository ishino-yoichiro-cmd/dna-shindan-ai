// POST /api/match
// 相性診断：2人のDNA診断データから LLM で相性レポートを生成
// 入力：{ selfId, selfPassword, targetId } (selfPasswordで自分認証、targetIdは公開)
// 出力：{ ok, content: string }

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';
export const maxDuration = 250;

interface Body {
  selfId?: string;
  selfPassword?: string;
  selfToken?: string;
  targetId?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = (await req.json()) as Body; } catch { return json({ ok: false, error: 'invalid_body' }, 400); }
  const { selfId, selfPassword, selfToken, targetId } = body;
  if (!selfId || !targetId) return json({ ok: false, error: 'self_and_target_required' }, 400);
  if (selfId === targetId) return json({ ok: false, error: 'cannot_match_self' }, 400);

  const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!sUrl || !sKey || !apiKey) return json({ ok: false, error: 'server_not_configured' }, 500);
  const supa = createClient(sUrl, sKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // 自分のレコード取得＋認証
  const { data: selfData } = await supa
    .from('dna_diagnoses')
    .select('id, access_token, password_hash, first_name, last_name, status, celestial_results, scores, narrative_answers, style_sample, match_history')
    .eq('id', selfId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const self = selfData as any;
  if (!self) return json({ ok: false, error: 'self_not_found' }, 404);
  let authed = false;
  if (selfToken && selfToken === self.access_token) authed = true;
  if (!authed && selfPassword && self.password_hash) {
    authed = await bcrypt.compare(selfPassword, self.password_hash);
  }
  if (!authed) return json({ ok: false, error: 'unauthorized' }, 401);
  if (self.status !== 'completed') return json({ ok: false, error: 'self_diagnosis_not_completed' }, 425);

  // K-005: 日次レート制限（1日3件まで）
  const todayJst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const history = Array.isArray(self.match_history) ? self.match_history : [];
  const todayCount = history.filter((h: {created_at?: string}) =>
    (h.created_at ?? '').slice(0, 10) === todayJst
  ).length;
  if (todayCount >= 3) {
    return json({ ok: false, error: '1日3回まで相性診断できます。明日また試してください。' }, 429);
  }

  // 相手のレコード取得（スコア・命術のみ取得。個人記述は相手の同意なく使用しない）
  // narrative_answers / style_sample / report_text は相手の認証なしに取得禁止（個人情報保護）
  const { data: targetData } = await supa
    .from('dna_diagnoses')
    .select('id, first_name, last_name, clone_display_name, status, celestial_results, scores')
    .eq('id', targetId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const target = targetData as any;
  if (!target) return json({ ok: false, error: 'target_not_found' }, 404);
  if (target.status !== 'completed') return json({ ok: false, error: 'target_diagnosis_not_completed' }, 425);

  const anth = new Anthropic({ apiKey, timeout: 230000 });

  const selfName = self.first_name ?? 'A';
  const targetName = target.clone_display_name ?? target.first_name ?? 'B';

  const systemPrompt = `あなたは2人のDNA診断データを統合解析する相性アナリストです。
占い口調・スピリチュアル用語禁止。読者が「ちゃんと見てもらえた」と感じる温度感で書く。

書くべき構造（最低3000字）：
## 1. 二人の核（約500字）
2人それぞれの命術・心理スコア・本人記述から抽出した「核」を1段落ずつ。

## 2. 響きあう点（約700字）
2人が相互に強化しあうポイントを最低3つ、具体行動シーン込みで。

## 3. ぶつかる点・すれ違いやすい点（約700字）
構造的に避けがたい摩擦を最低2つ、その根本原因と対処法を。

## 4. このペアでしか起きないもの（約500字）
他の組合せでは生まれない、特異な化学反応。

## 5. 関係を深めるための具体行動3つ（約400字）
今週・今月・今年で実行できるレベルで。

## 6. 一行サマリー
「この2人を一言で言えば」`;

  const userPrompt = `## 自分（${selfName}）
- 命術16: ${JSON.stringify(self.celestial_results ?? {}).slice(0, 2000)}
- 心理スコア: ${JSON.stringify(self.scores ?? {}).slice(0, 1500)}
- 本人記述: ${JSON.stringify(self.narrative_answers ?? {}).slice(0, 1500)}
- 文体: ${(self.style_sample ?? '').slice(0, 200)}

## 相手（${targetName}）
- 命術16: ${JSON.stringify(target.celestial_results ?? {}).slice(0, 2000)}
- 心理スコア: ${JSON.stringify(target.scores ?? {}).slice(0, 1500)}

上記をもとに、2人の相性を構造化レポートとして書いてください。`;

  try {
    const resp = await anth.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const content = resp.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim();

    // self.match_history に追記
    const history = Array.isArray(self.match_history) ? self.match_history : [];
    history.unshift({
      target_id: targetId,
      target_name: targetName,
      created_at: new Date().toISOString(),
      content,
    });
    if (history.length > 20) history.length = 20;
    await supa
      .from('dna_diagnoses')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ match_history: history } as any)
      .eq('id', selfId);

    return json({ ok: true, content, targetName, selfName });
  } catch (e) {
    const isOverload = e instanceof Error && (e.message.includes('overloaded') || e.message.includes('529'));
    const isRateLimit = e instanceof Error && e.message.includes('429');
    const errMsg = isOverload ? 'AIが混み合っています。しばらくお待ちください。'
      : isRateLimit ? 'リクエストが集中しています。1分後に再試行してください。'
      : '相性診断の生成に失敗しました。再試行してください。';
    return json({ ok: false, error: errMsg }, 500);
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}
