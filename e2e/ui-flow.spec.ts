import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const expectedPath = path.resolve(__dirname, '../e2e-expected.json');
const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf-8'));

interface UIFlow {
  name: string;
  start_path: string;
  click_text: string;
  expect_after_click_text: string;
  expect_url_unchanged?: boolean;
}

const flows: UIFlow[] = Array.isArray(expected.ui_flows) ? expected.ui_flows : [];

test.describe('🛡 UX Flow: クリック→次画面 シナリオ', () => {
  if (flows.length === 0) {
    test('ui_flows 未設定（e2e-expected.json で定義可）', async () => {
      test.skip();
    });
    return;
  }

  for (const flow of flows) {
    test(flow.name, async ({ page }) => {
      await page.goto(flow.start_path);
      const urlBefore = page.url();

      await page.getByText(flow.click_text, { exact: false }).first().click();

      await expect(
        page.locator('body'),
        `クリック後に "${flow.expect_after_click_text}" が画面に表示されること`,
      ).toContainText(flow.expect_after_click_text, { timeout: 5000 });

      if (flow.expect_url_unchanged) {
        const urlAfter = page.url();
        const before = new URL(urlBefore);
        const after = new URL(urlAfter);
        expect(
          after.pathname,
          `URLパスが ${before.pathname} のまま不変であること（クリックで遷移しない設計）`,
        ).toBe(before.pathname);
      }
    });
  }
});
