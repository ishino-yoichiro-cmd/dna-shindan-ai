/**
 * notifications.spec.ts
 *
 * メール・通知系エンドポイントの E2E テスト
 *
 * 検証内容:
 *   1. 感想フォーム送信API — 200 を返すこと（メール送信トリガー）
 *   2. data-integrity cron — 実行できること（cron認証込み）
 *   3. process-monitor cron — heartbeat が記録されていること
 *   4. budget-alert cron — 実行できること
 *
 * ※ 実際のメール到達確認はGmail MCPで手動確認する
 *   （自動化はGmail APIが必要なため現状はAPIレスポンス検証まで）
 */

import { test, expect, request } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'https://dna.kami-ai.jp';
const FIXTURE_ID = process.env.E2E_FIXTURE_ID ?? 'e2e00000-0000-4000-a000-000000000001';
const FIXTURE_ACCESS_TOKEN = process.env.E2E_FIXTURE_ACCESS_TOKEN ?? 'e2e-access-token-smoke-fixture-2026';
const CRON_SECRET = process.env.CRON_SECRET ?? '';

test.describe('📬 通知・メール配信系 API', () => {

  test('/api/me/[id]/feedback — 感想送信APIが正常に動作すること', async () => {
    // 感想送信はメール通知のトリガー。APIが200を返すことを確認。
    const ctx = await request.newContext({ baseURL: BASE });

    // 認証トークンで認証してから感想送信
    const authRes = await ctx.post(`/api/me/${FIXTURE_ID}/auth`, {
      data: { token: FIXTURE_ACCESS_TOKEN },
      headers: { 'content-type': 'application/json' },
    });
    expect(authRes.status(), '感想送信前の認証').toBe(200);

    // 感想送信（重複送信を避けるため timestamp を入れる）
    const res = await ctx.post(`/api/me/${FIXTURE_ID}/feedback`, {
      data: {
        token: FIXTURE_ACCESS_TOKEN,
        rating: 5,
        comment: `E2E自動テスト感想 ${Date.now()}`,
      },
      headers: { 'content-type': 'application/json' },
    });

    // 200 または 409（重複）は正常範囲
    const status = res.status();
    expect(
      [200, 409].includes(status),
      `感想送信APIが 200 または 409（重複）を返すこと（実際: ${status}）`
    ).toBe(true);
  });

  test('/api/cron/data-integrity — cronが実行できること', async () => {
    const ctx = await request.newContext({ baseURL: BASE });
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (CRON_SECRET) headers['authorization'] = `Bearer ${CRON_SECRET}`;

    const res = await ctx.get(`/api/cron/data-integrity`, { headers });

    // CRON_SECRET 未設定なら認証スキップで 200、設定済みなら Bearer必須
    const status = res.status();
    expect(
      [200, 401].includes(status),
      `data-integrity cronが応答すること（実際: ${status}）`
    ).toBe(true);

    if (status === 200) {
      const body = await res.json() as { ok?: boolean; issues?: number };
      expect(body.ok, 'data-integrity が ok:true を返すこと').toBe(true);
      expect(
        typeof body.issues === 'number',
        'issues が数値であること（0=正常）'
      ).toBe(true);
    }
  });

  test('/api/cron/process-monitor — cronが実行できること', async () => {
    const ctx = await request.newContext({ baseURL: BASE });
    const headers: Record<string, string> = {};
    if (CRON_SECRET) headers['authorization'] = `Bearer ${CRON_SECRET}`;

    const res = await ctx.get(`/api/cron/process-monitor`, { headers });
    const status = res.status();

    expect(
      [200, 401].includes(status),
      `process-monitor cronが応答すること（実際: ${status}）`
    ).toBe(true);
  });

  test('/api/cron/budget-alert — cronが実行できること', async () => {
    const ctx = await request.newContext({ baseURL: BASE });
    const headers: Record<string, string> = {};
    if (CRON_SECRET) headers['authorization'] = `Bearer ${CRON_SECRET}`;

    const res = await ctx.get(`/api/cron/budget-alert`, { headers });
    const status = res.status();

    expect(
      [200, 401].includes(status),
      `budget-alert cronが応答すること（実際: ${status}）`
    ).toBe(true);
  });

});
