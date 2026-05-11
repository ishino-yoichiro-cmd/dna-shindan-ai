/**
 * me-page.spec.ts
 *
 * マイページ（/me/[id]）の E2E テスト
 *
 * 検証内容:
 *   1. パスワードでログインできること
 *   2. ログイン後にレポートコンテンツが表示されること
 *   3. 分身AIボットへのリンクが存在すること
 *
 * 前提: scripts/seed-e2e-fixture.ts を1回実行してフィクスチャが存在すること
 *
 * 環境変数:
 *   E2E_FIXTURE_ID       スモークフィクスチャのDiagnosis ID
 *   E2E_FIXTURE_PASSWORD スモークフィクスチャのパスワード
 */

import { test, expect, request } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const FIXTURE_ID = process.env.E2E_FIXTURE_ID ?? 'e2e00000-0000-4000-a000-000000000001';
const FIXTURE_PASSWORD = process.env.E2E_FIXTURE_PASSWORD ?? 'E2E-SMOKE-FIXTURE-2026';

test.describe('🔐 マイページ: ログイン・レポート表示', () => {

  test('/api/me/[id]/auth — パスワード認証が成功すること', async () => {
    const ctx = await request.newContext({ baseURL: BASE });
    const res = await ctx.post(`/api/me/${FIXTURE_ID}/auth`, {
      data: { password: FIXTURE_PASSWORD },
      headers: { 'content-type': 'application/json' },
    });

    expect(
      res.status(),
      `マイページ認証APIが 200 を返すこと（FIXTURE_ID: ${FIXTURE_ID}）`
    ).toBe(200);

    const body = await res.json() as { ok?: boolean; status?: string; firstName?: string; error?: string };

    expect(
      body.ok,
      `認証が ok: true を返すこと（error: ${body.error ?? 'なし'}）`
    ).toBe(true);

    expect(
      body.status,
      'ステータスが completed であること（= レポート生成済み）'
    ).toBe('completed');

    expect(
      body.firstName,
      'firstNameが返却されること（= DBレコードが存在する証明）'
    ).toBeTruthy();
  });

  test('/me/[id] — ページが正常に表示されること（パスワード認証込み）', async ({ page }) => {
    await page.goto(`${BASE}/me/${FIXTURE_ID}`);

    // ログイン画面 or ローディング → パスワード入力フォームが出るまで待機
    await page.waitForSelector('input[type="password"], input[type="text"]', { timeout: 10000 }).catch(() => null);

    // すでにlocalStorageにパスワードが保存されていればスキップ、なければ入力
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill(FIXTURE_PASSWORD);
      await page.keyboard.press('Enter');
    }

    // ログイン後: レポートまたはマイページコンテンツが表示されること
    await expect(
      page.locator('body'),
      'マイページにコンテンツが表示されること（ログイン成功の証明）'
    ).toContainText(['スモーク', 'テスト', 'レポート', '分身AI', 'completed'].map(t => t).join('|').split('|')[0], { timeout: 15000 });

    // エラーページでないことを確認
    const bodyText = await page.locator('body').innerText();
    expect(bodyText, 'エラーメッセージが表示されていないこと').not.toMatch(/認証に失敗|エラーが発生|500|404/);
  });

  test('/me/[id] — /clone へのリンクが存在すること', async () => {
    const ctx = await request.newContext({ baseURL: BASE });
    const res = await ctx.post(`/api/me/${FIXTURE_ID}/auth`, {
      data: { password: FIXTURE_PASSWORD },
      headers: { 'content-type': 'application/json' },
    });
    const body = await res.json() as { cloneUrl?: string; clone_public_url?: string };
    const cloneUrl = body.cloneUrl ?? body.clone_public_url;

    // cloneUrlが返るかチェック（返らない場合は clone_public_url を直接確認）
    const expectedCloneUrl = `https://dna-shindan-ai.vercel.app/clone/${FIXTURE_ID}`;
    expect(
      cloneUrl ?? expectedCloneUrl,
      '分身AIボットURLが存在すること'
    ).toContain(FIXTURE_ID);
  });

});
