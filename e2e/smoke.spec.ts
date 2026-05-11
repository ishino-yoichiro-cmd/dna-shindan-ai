import { test, expect, request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const expectedPath = path.resolve(__dirname, '../e2e-expected.json');
const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'));

test.describe('🛡 Smoke: main user journey', () => {
  test('ホーム到達 + 主目的キーワード DOM 存在', async ({ page }) => {
    const url = expected.main_url_path ?? '/';
    const response = await page.goto(url);
    expect(response?.status(), 'HTTP ステータスが 2xx であること').toBeLessThan(400);

    // 主目的キーワードの DOM 存在チェック
    if (Array.isArray(expected.main_keywords)) {
      for (const kw of expected.main_keywords) {
        if (typeof kw === 'string' && !kw.startsWith('TODO:')) {
          await expect(
            page.locator('body'),
            `主目的キーワード "${kw}" が DOM に存在すること（"側だけで裏なし" 防止）`
          ).toContainText(kw);
        }
      }
    }

    // タイトル空でないこと
    await expect(page).not.toHaveTitle(/^$/);
  });

  test('追加ナビゲーション経路', async ({ page }) => {
    const paths: string[] = expected.navigation_paths ?? [];
    test.skip(paths.length <= 1, 'navigation_paths 1件以下のためスキップ');
    for (const p of paths.slice(1)) {
      const r = await page.goto(p);
      expect(r?.status(), `${p} が 2xx`).toBeLessThan(400);
    }
  });
});

test.describe('🛡 Smoke: フォーム送信（form_smoke._enabled が true のとき）', () => {
  test.skip(!expected.form_smoke?._enabled, 'form_smoke 無効のためスキップ');

  test('実機 POST → 2xx → body 検証', async ({ baseURL }) => {
    const fs_cfg = expected.form_smoke;
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.post(fs_cfg.endpoint, {
      data: fs_cfg.payload,
      headers: { 'content-type': 'application/json' },
    });

    if (fs_cfg.expect_status_2xx) {
      expect(res.status(), 'フォーム送信が 2xx であること').toBeLessThan(400);
    }

    const body = await res.text();

    if (fs_cfg.expect_body_contains) {
      expect(body, `成功シグナル "${fs_cfg.expect_body_contains}" 含有`).toContain(fs_cfg.expect_body_contains);
    }
    if (fs_cfg.expect_body_not_contains) {
      expect(body, `エラーシグナル "${fs_cfg.expect_body_not_contains}" 非含有`).not.toContain(fs_cfg.expect_body_not_contains);
    }

    // 日本語エラー文言の混入禁止
    expect(body, '英語エラー文言の混入禁止 (feedback_japanese_errors_only)').not.toMatch(/"(error|message)"\s*:\s*"[A-Z][a-z]+ (Error|failed|invalid|required)"/);
  });
});

test.describe('🛡 Smoke: アクセシビリティ自動監査', () => {
  test.skip(!expected.a11y_check?._enabled, 'a11y_check 無効のためスキップ');

  test('axe-core 違反検出', async ({ page }) => {
    await page.goto(expected.main_url_path ?? '/');
    // axe-core が dynamic require で取れない場合スキップ
    let AxeBuilder: any;
    try {
      ({ default: AxeBuilder } = await import('@axe-core/playwright'));
    } catch {
      test.skip(true, '@axe-core/playwright 未インストール');
      return;
    }
    const result = await new AxeBuilder({ page }).analyze();
    const failOn: string[] = expected.a11y_check.fail_on_violations ?? ['critical'];
    const violations = result.violations.filter((v: any) => failOn.includes(v.impact));
    if (violations.length > 0) {
      console.error('a11y violations:', JSON.stringify(violations.map((v: any) => ({ id: v.id, impact: v.impact, help: v.help })), null, 2));
    }
    expect(violations, `深刻 a11y 違反 0 件であること`).toEqual([]);
  });
});
