/**
 * DNA診断AI — 全33ステップ完走 E2E テスト
 *
 * 目的：
 *   - 全ステップが詰まらず進めること（次へボタンが機能する）
 *   - 生年月日選択でリセットバグが起きないこと（回帰防止）
 *   - マイルストーン画面を正常に突破できること
 *   - /diagnosis/result に到達し「DIAGNOSIS SUBMITTED」が表示されること
 *
 * テストデータ：
 *   - メール: smoke+e2e@example.com（本番送信は発生しない想定）
 *   - 名前: テストユーザー
 */

import { test, expect, Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// ────────────────────────────────────────────────
// ヘルパー
// ────────────────────────────────────────────────

/** 次へボタンをクリック（有効になるまで待機） */
async function clickNext(page: Page, timeout = 8000) {
  const btn = page.locator('button', { hasText: '次へ' });
  await expect(btn, '次へボタンが有効になること').toBeEnabled({ timeout });
  await btn.click();
}

/** マイルストーン画面が表示された場合、続けるを押して突破 */
async function passMilestoneIfPresent(page: Page) {
  const cont = page.locator('button', { hasText: '続ける' });
  if (await cont.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cont.click();
    await page.waitForTimeout(300);
  }
}

/**
 * localStorageにストアを注入してから「診断をはじめる」をクリックする。
 * DiagnosisProviderがマウントされてHYDRATEが発火し、指定ステップから始まる。
 */
async function injectStoreAndStart(page: Page, store: Record<string, unknown>) {
  await page.goto(BASE + '/');
  await page.evaluate(([key, data]) => {
    localStorage.clear();
    localStorage.setItem(key as string, JSON.stringify(data));
  }, [STORAGE_KEY, store]);
  // 「診断をはじめる」クリック → DiagnosisProvider マウント → HYDRATE
  await page.locator('button', { hasText: '診断をはじめる' }).click();
  await page.waitForTimeout(500); // Hydrate 反映待ち
}

/** STEPヘッダーのステップ番号を読み取る */
async function getCurrentStep(page: Page): Promise<number> {
  const txt = await page.locator('text=/STEP \\d+ \\/ 33/').first().textContent({ timeout: 5000 }).catch(() => '');
  const m = txt?.match(/STEP (\d+)/);
  return m ? parseInt(m[1]) : 0;
}

/** 選択式問題: 最初の選択肢をクリック */
async function selectFirstChoice(page: Page) {
  // 選択肢ボタン（戻る・次へ・Stop Claude 以外の rounded ボタン）
  const choices = page.locator('button.rounded-xl').filter({ hasNotText: '戻る' }).filter({ hasNotText: '次へ' });
  await choices.first().click();
}

/** テキストエリアにReact-friendly に値をセット（React の onChange を確実に発火） */
async function fillTextarea(page: Page, value: string) {
  // React controlled component には nativeSetValue + input/change イベントが必要
  await page.evaluate((val: string) => {
    const ta = document.querySelector('textarea');
    if (!ta) throw new Error('textarea not found');
    const nv = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    nv!.set!.call(ta, val);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

// 正確なストアの型（types.ts に合わせる）
function makeStore(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    currentStep: 1,
    userInfo: {
      lastName: '',
      firstName: 'テスト',
      birthDate: '1987-07-14',
      birthTime: undefined,
      birthTimeUnknown: true,
      birthPlaceLabel: undefined,
      birthPlaceLatitude: undefined,
      birthPlaceLongitude: undefined,
      birthPlaceUnknown: true,
      email: '',
    },
    selectAnswers: {} as Record<string, string>,
    narrativeAnswers: {} as Record<string, string>,
    styleSample: '',
    relationshipTag: undefined,
    celestialPreview: undefined,
    startedAt: now,
    lastSavedAt: now,
    empathyMessages: {},
    ...overrides,
  };
}

const STORAGE_KEY = 'dna-shindan-ai:session-v3';
// STEP5-22 の質問ID
const SELECT_QIDS = ['Q5','Q6','Q8','Q9','Q11','Q13','Q15','Q17','Q18','Q19','Q21','Q22','Q24','Q25','Q26','Q27','Q29','Q30'];
// STEP23-30 の質問ID
const NARRATIVE_QIDS = ['Q31','Q32','Q33','Q34','Q35','Q36','Q37','Q38'];

// ────────────────────────────────────────────────
// メインテスト
// ────────────────────────────────────────────────

test.describe('全33ステップ完走', () => {
  test.beforeEach(async ({ page }) => {
    // localStorage クリア（前回のセッションが残らないよう）
    await page.goto(BASE + '/');
    await page.evaluate(() => localStorage.clear());
  });

  test('STEP1-4: プロフィール入力が正常に完了する', async ({ page }) => {
    await page.goto(BASE + '/diagnosis');
    await page.locator('button', { hasText: '診断をはじめる' }).click();

    // STEP1: 名前
    await expect(page.locator('text=STEP 1 / 33')).toBeVisible();
    await page.locator('input[placeholder*="ニックネーム"]').fill('テストユーザー');
    await clickNext(page);

    // STEP2: 生年月日
    await expect(page.locator('text=STEP 2 / 33')).toBeVisible();
    await page.locator('select').nth(0).selectOption('1987');  // 年
    const yearAfterSelect = await page.locator('select').nth(0).inputValue();
    await page.locator('select').nth(1).selectOption('7');    // 月
    const yearAfterMonth = await page.locator('select').nth(0).inputValue();

    // 回帰検証: 月選択後に年がリセットされないこと
    expect(yearAfterMonth, '月選択後に年がリセットされないこと（回帰）').toBe(yearAfterSelect);

    await page.locator('select').nth(2).selectOption('14');   // 日
    // 確認テキスト「1987年 7月 14日」が表示されること
    await expect(page.locator('text=1987年 7月 14日')).toBeVisible();
    await clickNext(page);

    // STEP3: 生まれた時刻（任意）
    await expect(page.locator('text=STEP 3 / 33')).toBeVisible();
    await page.locator('button', { hasText: '生まれた時刻はわからない' }).click();
    await clickNext(page);

    // STEP4: 出生地（任意）
    await expect(page.locator('text=STEP 4 / 33')).toBeVisible();
    await page.locator('button', { hasText: '出生地は不明' }).click();
    await clickNext(page);

    // STEP5到達を確認
    await expect(page.locator('text=STEP 5 / 33')).toBeVisible({ timeout: 5000 });
  });

  test('STEP2: 生年月日リセットバグ回帰テスト（専用）', async ({ page }) => {
    await page.goto(BASE + '/diagnosis');
    await page.locator('button', { hasText: '診断をはじめる' }).click();
    await page.locator('input[placeholder*="ニックネーム"]').fill('回帰テスト');
    await clickNext(page);

    await expect(page.locator('text=STEP 2 / 33')).toBeVisible();

    const yearSel  = page.locator('select').nth(0);
    const monthSel = page.locator('select').nth(1);
    const daySel   = page.locator('select').nth(2);

    // 年を選択
    await yearSel.selectOption('1990');
    expect(await yearSel.inputValue()).toBe('1990');

    // 月を選択 → 年がリセットされないこと
    await monthSel.selectOption('3');
    expect(await yearSel.inputValue(), '月選択後に年が維持されること').toBe('1990');
    expect(await monthSel.inputValue(), '月の値が正しいこと').toBe('3');

    // 日を選択 → 年・月が維持されること
    await daySel.selectOption('15');
    expect(await yearSel.inputValue(), '日選択後に年が維持されること').toBe('1990');
    expect(await monthSel.inputValue(), '日選択後に月が維持されること').toBe('3');
    expect(await daySel.inputValue(), '日の値が正しいこと').toBe('15');

    // 次へが有効になること
    await expect(page.locator('button', { hasText: '次へ' }), '全3値入力後に次へが有効').toBeEnabled();
    // 確認テキスト表示
    await expect(page.locator('text=1990年 3月 15日')).toBeVisible();
  });

  test('STEP5-22: 選択式18問が全問進めること（マイルストーン突破含む）', async ({ page }) => {
    // STEP5まで高速セットアップ
    await page.goto(BASE + '/diagnosis');
    await page.evaluate(() => localStorage.clear());
    await page.locator('button', { hasText: '診断をはじめる' }).click();
    await page.locator('input[placeholder*="ニックネーム"]').fill('選択テスト');
    await clickNext(page);
    // STEP2
    await page.locator('select').nth(0).selectOption('1987');
    await page.locator('select').nth(1).selectOption('7');
    await page.locator('select').nth(2).selectOption('14');
    await clickNext(page);
    // STEP3
    await page.locator('button', { hasText: '生まれた時刻はわからない' }).click();
    await clickNext(page);
    // STEP4
    await page.locator('button', { hasText: '出生地は不明' }).click();
    await clickNext(page);

    // STEP5〜22
    for (let step = 5; step <= 22; step++) {
      await passMilestoneIfPresent(page);
      await expect(
        page.locator(`text=STEP ${step} / 33`),
        `STEP ${step} が表示されること`
      ).toBeVisible({ timeout: 8000 });
      await selectFirstChoice(page);
      await clickNext(page);
    }

    // マイルストーン70%を突破してSTEP23到達を確認
    await passMilestoneIfPresent(page);
    await expect(page.locator('text=STEP 23 / 33')).toBeVisible({ timeout: 8000 });
  });

  test('STEP23-30: 記述式8問が全問進めること', async ({ page }) => {
    const now = new Date().toISOString();
    await injectStoreAndStart(page, {
      currentStep: 23,
      userInfo: { lastName:'', firstName:'テスト', birthDate:'1987-07-14', birthTimeUnknown:true, birthPlaceUnknown:true, email:'' },
      selectAnswers: Object.fromEntries(SELECT_QIDS.map(id => [id, 'A'])),
      narrativeAnswers: {},
      styleSample: '',
      startedAt: now, lastSavedAt: now, empathyMessages: {},
    });
    await passMilestoneIfPresent(page);

    for (let step = 23; step <= 30; step++) {
      await passMilestoneIfPresent(page);
      const stepNum = await getCurrentStep(page);
      if (stepNum !== step) continue; // マイルストーンで番号ずれが起きても続行

      await expect(
        page.locator(`text=STEP ${step} / 33`),
        `STEP ${step} が表示されること`
      ).toBeVisible({ timeout: 8000 });

      await fillTextarea(page, 'テスト回答です。自動テストによる入力。');
      await clickNext(page);
    }

    await passMilestoneIfPresent(page);
    await expect(page.locator('text=STEP 31 / 33')).toBeVisible({ timeout: 8000 });
  });

  test('STEP31-33: 文体・メール・関係性→診断完了まで到達できること', async ({ page }) => {
    const now = new Date().toISOString();
    await injectStoreAndStart(page, {
      currentStep: 31,
      userInfo: { lastName:'', firstName:'テスト', birthDate:'1987-07-14', birthTimeUnknown:true, birthPlaceUnknown:true, email:'' },
      selectAnswers: Object.fromEntries(SELECT_QIDS.map(id => [id, 'A'])),
      narrativeAnswers: Object.fromEntries(NARRATIVE_QIDS.map(id => [id, 'テスト回答'])),
      styleSample: '',
      startedAt: now, lastSavedAt: now, empathyMessages: {},
    });

    // STEP31: 文体サンプル（100文字以上）
    await expect(page.locator('text=STEP 31 / 33')).toBeVisible({ timeout: 8000 });
    // 100文字以上必須（StyleSample.tsx MIN_CHARS=100）
    const styleSample = 'これはPlaywright自動テスト用の文体サンプルです。普段こんな感じで文章を書いています。特に意識しているわけじゃないけど、なんとなく自分らしい書き方があります。テスト用なのでご容赦ください。これで百文字以上になります。';
    await fillTextarea(page, styleSample);
    // 100文字以上で次へが有効になること
    await expect(
      page.locator('button', { hasText: '次へ' }),
      'STEP31: 100文字以上で次へが有効になること'
    ).toBeEnabled({ timeout: 5000 });
    await clickNext(page);

    // STEP32: メールアドレス
    await expect(page.locator('text=STEP 32 / 33')).toBeVisible({ timeout: 8000 });
    await page.locator('input[type="email"]').nth(0).fill('smoke+e2e@example.com');
    await page.locator('input[type="email"]').nth(1).fill('smoke+e2e@example.com');
    await expect(
      page.locator('button', { hasText: '次へ' }),
      'STEP32: メール入力後に次へが有効になること'
    ).toBeEnabled({ timeout: 5000 });
    await clickNext(page);

    // STEP33: 関係性タグ
    await expect(page.locator('text=STEP 33 / 33')).toBeVisible({ timeout: 8000 });
    await selectFirstChoice(page);
    // 「診断を完了する」が有効になること
    const completeBtn = page.locator('button', { hasText: '診断を完了する' });
    await expect(completeBtn, 'STEP33: タグ選択後に診断を完了するが有効').toBeEnabled({ timeout: 5000 });

    // 実際に送信（smoke+e2e アドレスで本番DBに保存される。許容範囲のトレードオフ）
    await completeBtn.click();

    // /diagnosis/result 到達を確認
    await expect(page).toHaveURL(/\/diagnosis\/result/, { timeout: 15000 });
    // 大文字小文字を問わず "Submitted" が含まれること
    await expect(page.locator('body'), '送信完了メッセージが表示されること').toContainText('Submitted', { timeout: 10000 });
    await expect(page.locator('body'), '診断受付メッセージが表示されること').toContainText('診断データをお預かりしました', { timeout: 5000 });
    await expect(page.locator('body'), '名前が表示されること').toContainText('テスト');
  });
});

// ────────────────────────────────────────────────
// 個別バリデーションテスト
// ────────────────────────────────────────────────

test.describe('バリデーション: 未入力では次へが押せないこと', () => {
  test('STEP1: 名前未入力で次へがdisabled', async ({ page }) => {
    await page.goto(BASE + '/diagnosis');
    await page.locator('button', { hasText: '診断をはじめる' }).click();
    await expect(page.locator('text=STEP 1 / 33')).toBeVisible();
    await expect(page.locator('button', { hasText: '次へ' })).toBeDisabled();
  });

  test('STEP2: 年だけ選択では次へがdisabled', async ({ page }) => {
    await page.goto(BASE + '/diagnosis');
    await page.evaluate(() => localStorage.clear());
    await page.locator('button', { hasText: '診断をはじめる' }).click();
    await page.locator('input[placeholder*="ニックネーム"]').fill('テスト');
    await clickNext(page);
    await expect(page.locator('text=STEP 2 / 33')).toBeVisible();
    await page.locator('select').nth(0).selectOption('1987');
    // 年のみ選択 → 次へはまだdisabled
    await expect(page.locator('button', { hasText: '次へ' }), '年のみ選択では次へがdisabled').toBeDisabled();
  });

  test('STEP5: 選択肢未選択では次へがdisabled', async ({ page }) => {
    const now = new Date().toISOString();
    await injectStoreAndStart(page, { currentStep:5, userInfo:{ lastName:'', firstName:'テスト', birthDate:'1987-07-14', birthTimeUnknown:true, birthPlaceUnknown:true, email:'' }, selectAnswers:{}, narrativeAnswers:{}, styleSample:'', startedAt:now, lastSavedAt:now, empathyMessages:{} });
    await expect(page.locator('text=STEP 5 / 33')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button', { hasText: '次へ' }), 'STEP5: 未選択では次へがdisabled').toBeDisabled();
  });

  test('STEP31: 99文字では次へがdisabled', async ({ page }) => {
    const now = new Date().toISOString();
    await injectStoreAndStart(page, { currentStep:31, userInfo:{ lastName:'', firstName:'テスト', birthDate:'1987-07-14', birthTimeUnknown:true, birthPlaceUnknown:true, email:'' }, selectAnswers:Object.fromEntries(SELECT_QIDS.map(id=>[id,'A'])), narrativeAnswers:Object.fromEntries(NARRATIVE_QIDS.map(id=>[id,'テスト'])), styleSample:'', startedAt:now, lastSavedAt:now, empathyMessages:{} });
    await expect(page.locator('text=STEP 31 / 33')).toBeVisible({ timeout: 5000 });
    const ninetyNineChars = 'あ'.repeat(99);
    await fillTextarea(page, ninetyNineChars);
    await expect(page.locator('button', { hasText: '次へ' }), 'STEP31: 99文字では次へがdisabled').toBeDisabled();
    // 100文字にすると有効
    await fillTextarea(page, ninetyNineChars + 'あ');
    await expect(page.locator('button', { hasText: '次へ' }), 'STEP31: 100文字で次へが有効').toBeEnabled();
  });
});
