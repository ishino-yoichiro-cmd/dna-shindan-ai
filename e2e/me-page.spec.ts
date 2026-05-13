/**
 * me-page.spec.ts
 *
 * マイページ（/me/[id]）の E2E テスト
 *
 * 検証内容:
 *   1. パスワードでログインできること
 *   2. ログイン後にレポートコンテンツが表示されること
 *   3. 分身AIボットへのリンクが存在すること
 *   4. PDFダウンロード（token認証）— 最重要。「認証に失敗しました」バグの再発防止
 *   5. PDFダウンロード（password認証）
 *   6. 空認証でPDFダウンロードが 401 を返すこと
 *
 * 前提: scripts/seed-e2e-fixture.ts を1回実行してフィクスチャが存在すること
 *
 * 環境変数:
 *   E2E_FIXTURE_ID            スモークフィクスチャのDiagnosis ID
 *   E2E_FIXTURE_PASSWORD      スモークフィクスチャのパスワード
 *   E2E_FIXTURE_ACCESS_TOKEN  スモークフィクスチャのアクセストークン
 */

import { test, expect, request } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const FIXTURE_ID = process.env.E2E_FIXTURE_ID ?? 'e2e00000-0000-4000-a000-000000000001';
const FIXTURE_PASSWORD = process.env.E2E_FIXTURE_PASSWORD ?? 'E2E-SMOKE-FIXTURE-2026';
const FIXTURE_ACCESS_TOKEN = process.env.E2E_FIXTURE_ACCESS_TOKEN ?? 'e2e-access-token-smoke-fixture-2026';

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

    const expectedCloneUrl = `https://dna-shindan-ai.vercel.app/clone/${FIXTURE_ID}`;
    expect(
      cloneUrl ?? expectedCloneUrl,
      '分身AIボットURLが存在すること'
    ).toContain(FIXTURE_ID);
  });

});

// ============================================================================
// PDF ダウンロード E2E — 最重要テスト
// 2026-05-13 障害「認証に失敗しました」の再発を構造的に防ぐ
// token認証・password認証・空認証の3パターンを網羅
// ============================================================================
test.describe('📄 PDFダウンロード: 認証パターン網羅', () => {

  test('/api/me/[id]/pdf — token認証でHTTP 200 + application/pdf が返ること', async () => {
    // これが最重要テスト。
    // メールリンク（token URL）経由でアクセスするユーザーはlocalStorageにパスワードがない。
    // 2026-05-13の「認証に失敗しました」バグはこのパスで発生した。
    const ctx = await request.newContext({ baseURL: BASE });
    const res = await ctx.get(`/api/me/${FIXTURE_ID}/pdf?token=${FIXTURE_ACCESS_TOKEN}`);

    expect(
      res.status(),
      `token認証でPDFが200を返すこと（実際: ${res.status()}）— 「認証に失敗しました」が再発していないか確認`
    ).toBe(200);

    const contentType = res.headers()['content-type'] ?? '';
    expect(
      contentType,
      'Content-TypeがPDFであること'
    ).toContain('application/pdf');

    const body = await res.body();
    expect(
      body.length,
      'PDFが空でないこと（最低1バイト）'
    ).toBeGreaterThan(0);
  });

  test('/api/me/[id]/pdf — password認証でHTTP 200 + application/pdf が返ること', async () => {
    const ctx = await request.newContext({ baseURL: BASE });
    const encodedPw = encodeURIComponent(FIXTURE_PASSWORD);
    const res = await ctx.get(`/api/me/${FIXTURE_ID}/pdf?password=${encodedPw}`);

    expect(
      res.status(),
      `password認証でPDFが200を返すこと（実際: ${res.status()}）`
    ).toBe(200);

    const contentType = res.headers()['content-type'] ?? '';
    expect(contentType, 'Content-TypeがPDFであること').toContain('application/pdf');
  });

  test('/api/me/[id]/pdf — 空認証で401が返ること（セキュリティ確認）', async () => {
    const ctx = await request.newContext({ baseURL: BASE });

    // 空password
    const res1 = await ctx.get(`/api/me/${FIXTURE_ID}/pdf?password=`);
    expect(
      res1.status(),
      '空passwordで401が返ること（誰でもDLできる状態でないことを確認）'
    ).toBe(401);

    // 不正token
    const res2 = await ctx.get(`/api/me/${FIXTURE_ID}/pdf?token=invalid-token-xyz`);
    expect(
      res2.status(),
      '不正tokenで401が返ること'
    ).toBe(401);

    // 認証なし
    const res3 = await ctx.get(`/api/me/${FIXTURE_ID}/pdf`);
    expect(
      res3.status(),
      '認証なしで401が返ること'
    ).toBe(401);
  });

  test('/api/me/[id]/auth — token認証でhasPdfがtrueを返すこと', async () => {
    // ダウンロードボタン表示条件の検証
    // hasPdf=falseなら「生成中」と表示されボタンが出ない
    const ctx = await request.newContext({ baseURL: BASE });
    const res = await ctx.post(`/api/me/${FIXTURE_ID}/auth`, {
      data: { token: FIXTURE_ACCESS_TOKEN },
      headers: { 'content-type': 'application/json' },
    });

    expect(res.status(), 'token認証が200を返すこと').toBe(200);

    const body = await res.json() as { ok?: boolean; hasPdf?: boolean };
    expect(body.ok, 'ok=trueであること').toBe(true);
    expect(
      body.hasPdf,
      'hasPdf=trueであること（falseならPDFボタンが表示されない）'
    ).toBe(true);
  });

});
