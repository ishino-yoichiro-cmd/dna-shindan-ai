/**
 * DNA診断AI — Google Sheets API クライアント
 *
 * Service Account JWT 認証でスプレッドシートに書き込む。
 *
 * 環境変数:
 *   GOOGLE_SHEETS_CLIENT_EMAIL  サービスアカウントの client_email
 *   GOOGLE_SHEETS_PRIVATE_KEY   サービスアカウントの private_key (\n エスケープ可)
 *   GOOGLE_SHEET_ID             集約先スプレッドシートID
 *   GOOGLE_SHEET_TAB_NAME       タブ名 (省略時 'diagnoses')
 *
 * 必要な権限:
 *   - スコープ: https://www.googleapis.com/auth/spreadsheets
 *   - 対象スプシをサービスアカウントの client_email に「編集者」として共有しておく
 */

import { google, type sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';

const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

let cachedSheets: sheets_v4.Sheets | null = null;

export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedSheets) return cachedSheets;

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (!clientEmail || !rawPrivateKey) {
    throw new Error(
      '[sheets/client] GOOGLE_SHEETS_CLIENT_EMAIL / GOOGLE_SHEETS_PRIVATE_KEY が未設定です。',
    );
  }

  // \n エスケープを実改行に戻す (Vercel等で保存される時に \\n になる対策)
  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  const auth = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [SHEETS_SCOPE],
  });

  cachedSheets = google.sheets({ version: 'v4', auth });
  return cachedSheets;
}

export interface SheetsEnv {
  spreadsheetId: string;
  tabName: string;
}

export function getSheetsEnv(): SheetsEnv {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('[sheets/client] GOOGLE_SHEET_ID が未設定です。');
  }
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME;
  if (!tabName) {
    throw new Error('[sheets/client] GOOGLE_SHEET_TAB_NAME が未設定です。.env で必ず指定してください（フォールバック値ハードコード禁止）。');
  }
  return { spreadsheetId, tabName };
}
