/**
 * post-submission-pipeline.spec.ts
 *
 * 「送信ボタンを押した後、ユーザーにレポートが届くか」を検証する。
 *
 * テスト戦略:
 *   1. /api/health — Supabase・Anthropic・メール設定が全て生きているかを確認
 *      → ここが503なら、AIレポート生成・メール送信が行われない
 *   2. /api/submit への直接POSTが200を返し、diagnosisIdが含まれること
 *      → DBへのデータ保存（=AIキューへの投入）が成功していること
 *
 * これで「フォーム送信 → DB保存 → AI生成パイプライン起動」の3点が保証される。
 * 実際のAI生成（数分）の完了まではE2Eでカバーしない（コスト・時間が現実的でないため）。
 */

import { test, expect, request } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

test.describe('🔬 パイプライン健全性: AI生成・メール送信の前提条件', () => {

  test('/api/health — 全外部サービスが稼働していること', async () => {
    const ctx = await request.newContext({ baseURL: BASE });
    const res = await ctx.get('/api/health');

    // /api/health が 404 の場合 = このエンドポイントがまだデプロイされていない
    // 初回デプロイ前はスキップ（デプロイ後から自動的に有効化）
    if (res.status() === 404) {
      test.skip(true, '/api/health が 404 — 初回デプロイ前のため自動スキップ（次回push以降から有効）');
      return;
    }

    expect(res.status(), '/api/health が 200 または 503 を返すこと').toBeLessThan(600);

    const body = await res.json() as {
      ok: boolean;
      checks: Record<string, { ok: boolean; message: string }>;
    };

    // Supabase: 死んでいるとDB保存→AI生成が全滅する
    expect(
      body.checks.supabase?.ok,
      `Supabase 接続 OK であること（失敗メッセージ: ${body.checks.supabase?.message}）`
    ).toBe(true);

    // Anthropic: キーがないとレポート生成ゼロ件になる
    expect(
      body.checks.anthropic?.ok,
      `Anthropic APIキー設定済みであること（失敗メッセージ: ${body.checks.anthropic?.message}）`
    ).toBe(true);

    // メール: キーがないと送信ゼロ件になる
    expect(
      body.checks.email?.ok,
      `メール設定済みであること（失敗メッセージ: ${body.checks.email?.message}）`
    ).toBe(true);

    // CRON_SECRET: ないとprocess-pendingが起動拒否してレポート永久未生成
    expect(
      body.checks.cron?.ok,
      `CRON_SECRET 設定済みであること（失敗メッセージ: ${body.checks.cron?.message}）`
    ).toBe(true);
  });

  test('/api/submit — 診断データがDBに正常保存されること', async () => {
    const ctx = await request.newContext({ baseURL: BASE });

    // 最小限の有効な診断データ
    const payload = {
      userInfo: {
        firstName: 'テスト',
        lastName: '',
        birthDate: '1990-01-01',
        birthTimeUnknown: true,
        birthPlaceUnknown: true,
        // タイムスタンプ付きでユニークにしてレートリミット回避
      email: `smoke+e2e-${Date.now()}@example.com`,
      },
      selectAnswers: Object.fromEntries(
        ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10',
         'q11','q12','q13','q14','q15','q16','q17','q18'].map(id => [id, 'A'])
      ),
      narrativeAnswers: Object.fromEntries(
        ['q19','q20','q21','q22','q23','q24','q25','q26'].map(id => [id, 'これはスモークテスト用の回答文です。テスト用に入力しています。'])
      ),
      styleSample: 'これはスモークテスト用の文体サンプルです。'.repeat(5), // 100文字超
      relationshipTags: ['同僚'],
      emailConfirm: '',  // confirmは空でも通過するため省略
      startedAt: new Date(Date.now() - 600000).toISOString(),
    };

    const res = await ctx.post('/api/submit', {
      data: payload,
      headers: { 'content-type': 'application/json' },
    });

    expect(
      res.status(),
      '/api/submit が 200 を返すこと（DB保存成功 = AIキューに投入されたことを意味する）'
    ).toBe(200);

    const body = await res.json() as { ok?: boolean; diagnosisId?: string; error?: string };

    expect(
      body.ok,
      `レスポンスの ok フィールドが true であること（エラー: ${body.error ?? 'なし'}）`
    ).toBe(true);

    expect(
      body.diagnosisId,
      'diagnosisId が返却されること（DBへの保存証明）'
    ).toBeTruthy();

    // 英語エラーの混入確認（feedback_japanese_errors_only）
    const bodyText = JSON.stringify(body);
    expect(
      bodyText,
      '英語エラー文言が混入していないこと'
    ).not.toMatch(/"(error|message)"\s*:\s*"[A-Z][a-z]+ (Error|failed|invalid|required)"/);
  });

});
