/**
 * 11プロダクト共通 ESLint flat config（ESLint v9+）。
 * 各プロダクトの `eslint.config.mjs` から extend する：
 *
 *   import harnessConfig from '../claude-team/_shared/templates/eslint/eslint.harness.mjs';
 *   export default [...harnessConfig, /* プロダクト固有ルール */ ];
 *
 * カバー範囲：
 * - eslint-plugin-security（OS Cmd Injection / XSS / unsafe regex 等）
 * - jsx-a11y（WCAG 2.2 自動チェック）
 * - サイレントフォールバック禁止（DNA診断AI 偽生年月日 INC 再発防止）
 * - console 残存検出
 * - process.env デフォルト値ハードコード禁止
 */

export default [
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      // === DNA診断AI 偽生年月日 INC 再発防止 ===
      // ?? 'デフォルト値' で日付/サンプル文字列を埋めるパターンを禁止
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "LogicalExpression[operator='??'] > Literal[value=/^\\d{4}-\\d{2}-\\d{2}$/]",
          message:
            "サイレントフォールバック禁止：?? 'YYYY-MM-DD' は DNA診断AI 偽生年月日事故の真因。null の場合は throw すること",
        },
        {
          selector:
            "LogicalExpression[operator='??'] > Literal[value=/^(サンプル|テスト|デフォルト|example)/]",
          message:
            "サイレントフォールバック禁止：?? 'サンプル値' は使うな。null の場合は throw か明示的なフォーム検証エラーを返すこと",
        },
        {
          // process.env.X || 'hardcoded' パターン
          selector:
            "LogicalExpression[operator='||'] > MemberExpression[object.object.name='process'][object.property.name='env'] + Literal[value=/^[a-zA-Z0-9_-]{8,}$/]",
          message:
            "env デフォルト値ハードコード禁止（INC-2026-05-02-02 再発リスク）。env が未設定なら throw すること",
        },
        {
          selector: "CallExpression[callee.name='execSync']",
          message:
            'OS Command Injection リスク：execSync 禁止。spawn(cmd, [args]) を使え（CWE-78）',
        },
        {
          selector:
            "CallExpression[callee.object.name='child_process'][callee.property.name='exec']",
          message: 'OS Command Injection リスク：child_process.exec 禁止。spawn を使え（CWE-78）',
        },
      ],

      // === 本番ログ汚染防止 ===
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // === デバッガ残存検出 ===
      'no-debugger': 'error',

      // === unsafe な型キャスト ===
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // === 未使用 import / 変数 ===
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // === API ルート専用ルール（Next.js App Router）===
  {
    files: ['**/app/api/**/*.ts', '**/app/api/**/*.tsx', '**/pages/api/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // req.body を直接 destructure（Zod 通さず）禁止
          selector:
            "VariableDeclarator > ObjectPattern.id ~ MemberExpression[property.name='body'][object.name='req']",
          message:
            'API入力検証必須：req.body を直接使わず、Zod スキーマで parse() してから使うこと（OWASP A03/API3）',
        },
      ],
    },
  },
];
