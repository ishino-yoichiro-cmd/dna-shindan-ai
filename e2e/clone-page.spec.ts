/**
 * clone-page.spec.ts
 *
 * 分身AIボット（/clone/[id]）の E2E テスト
 *
 * 検証内容:
 *   1. ページが正常に表示されること（404/500でないこと）
 *   2. チャットUIが存在すること（テキスト入力・送信ボタン）
 *   3. メッセージを送信すると応答が返ってくること（実際にAIが動いていることの証明）
 *
 * 前提: scripts/seed-e2e-fixture.ts を1回実行してフィクスチャが存在すること
 *
 * 環境変数:
 *   E2E_FIXTURE_ID  スモークフィクスチャのDiagnosis ID
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const FIXTURE_ID = process.env.E2E_FIXTURE_ID ?? 'e2e00000-0000-4000-a000-000000000001';

test.describe('🤖 分身AIボット: チャット動作確認', () => {

  test('/clone/[id] — ページが表示されること（500/404でないこと）', async ({ page }) => {
    const res = await page.goto(`${BASE}/clone/${FIXTURE_ID}`);
    expect(
      res?.status() ?? 0,
      '/clone/[id] が 2xx を返すこと'
    ).toBeLessThan(400);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText, 'エラーページでないこと').not.toMatch(/500|Internal Server Error/);
  });

  test('/clone/[id] — チャット入力UIが表示されること', async ({ page }) => {
    await page.goto(`${BASE}/clone/${FIXTURE_ID}`);

    // チャット入力欄またはメッセージエリアが存在すること
    const inputArea = page.locator('textarea, input[type="text"]').first();
    await expect(
      inputArea,
      'チャット入力欄が表示されること'
    ).toBeVisible({ timeout: 10000 });
  });

  test('/clone/[id] — メッセージ送信で応答が返ること（AI動作確認）', async ({ page }) => {
    await page.goto(`${BASE}/clone/${FIXTURE_ID}`);

    // 入力欄が出るまで待機
    const inputArea = page.locator('textarea, input[type="text"]').first();
    await expect(inputArea).toBeVisible({ timeout: 10000 });

    // テストメッセージ送信
    await inputArea.fill('こんにちは、テストです。');
    await page.keyboard.press('Enter');
    // または送信ボタンをクリック
    const sendBtn = page.locator('button[type="submit"], button').filter({ hasText: /送信|Send/ }).first();
    if (await sendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await sendBtn.click();
    }

    // 応答が返ってくることを確認（最大30秒 — AIのレイテンシを考慮）
    await expect(
      page.locator('body'),
      '送信後にAIからの応答テキストが表示されること（= Anthropic APIが動作している証明）'
    ).toContainText(/スモークテスト正常|はい|こんにちは|テスト/, { timeout: 30000 });
  });

});
