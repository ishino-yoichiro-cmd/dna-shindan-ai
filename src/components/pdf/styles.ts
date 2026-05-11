// DNA診断AI PDFレポート共通スタイル
// artist観点：紺・金・白基調、知的でセンスのある友人のトーンに合わせた品格

import { Font, StyleSheet } from '@react-pdf/renderer';
import path from 'node:path';
import { existsSync } from 'node:fs';

// =============================================================================
// フォント登録（Noto Sans JP / Regular & Bold）
// =============================================================================

let fontRegistered = false;

function resolveFontPath(filename: string): string | null {
  const candidates = [
    path.join(process.cwd(), 'public', 'fonts', filename),
    path.join(process.cwd(), 'app', 'public', 'fonts', filename),
    path.join(process.cwd(), '.next', 'server', 'app', 'public', 'fonts', filename),
    // Vercel function: /var/task/public/fonts/...
    path.join('/var/task', 'public', 'fonts', filename),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

function getFontSrc(filename: string): string {
  // 本番環境（Vercel function）：固定 alias URL を使用
  // VERCEL_URL は deployment-specific で SSO 保護がかかる場合があるため不採用
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return `https://dna-shindan-ai.vercel.app/fonts/${filename}`;
  }
  // ローカル開発・test:pdf スクリプト用：fsパス
  const local = resolveFontPath(filename);
  if (local) return local;
  // 最終fallback
  return `https://dna-shindan-ai.vercel.app/fonts/${filename}`;
}

export function registerFonts() {
  if (fontRegistered) return;

  const regularSrc = getFontSrc('NotoSansJP-Regular.ttf');
  const boldSrc = getFontSrc('NotoSansJP-Bold.ttf');
  console.log('[pdf/styles] font sources:', { regularSrc, boldSrc });

  Font.register({
    family: 'NotoSansJP',
    fonts: [
      { src: regularSrc, fontWeight: 400 },
      { src: boldSrc, fontWeight: 700 },
    ],
  });

  // 日本語テキスト行末ハイフン防止（根本対策）
  //
  // textkit の改行ロジック（@react-pdf/textkit/lib/textkit.js の getNodes）:
  //   syllables[i+1] がTRUTHY かつ hyphenated=true → penalty ノード → 改行時 '-' 挿入
  //   syllables[i+1] が FALSY ('' / undefined) → penalty スキップ → ハイフン挿入なし
  //
  // U+00AD (soft hyphen) は textkit の removeSoftHyphens() によって '' に変換される。
  // '' は FALSY なので penalty ノードが生成されない → 改行してもハイフンが付かない。
  // また '' は trim()==='' → glue(幅0) ノードとして扱われる。
  Font.registerHyphenationCallback((word) => {
    const chars = Array.from(word);
    // 各文字の後ろに U+00AD を挿入（末尾含む）→ removeSoftHyphens が '' に変換
    // → 単語内はすべて GLUE（ハイフンなし改行）
    // → 末尾の '' により隣接ラン境界でも penalty ノード未生成
    const result: string[] = [];
    for (let i = 0; i < chars.length; i++) {
      result.push(chars[i]);
      result.push('­'); // U+00AD: always append, even after last char
    }
    return result;
  });
  fontRegistered = true;
}

// =============================================================================
// カラーパレット（DNA診断AIブランド）
// 紺・金・白を主軸に、視認性強化のためのカテゴリカラー（青系＋温かみ）を追加
// =============================================================================
export const colors = {
  primary: '#0a1f44',      // 紺：見出し・章タイトル・アクセント線
  primaryLight: '#1a3370', // 紺薄：補助線・サブ見出し
  accent: '#c9a44b',       // 金：章番号・キーワード強調・装飾
  accentLight: '#e6cd84',  // 金薄：背景アクセント
  accentDeep: '#a8843b',   // 金濃：強アクセント

  text: '#1f2937',         // 本文：ダークグレー
  textSubtle: '#4b5563',   // 補足：ミドルグレー
  textMuted: '#6b7280',    // キャプション：薄いグレー
  textInverse: '#fbfaf6',  // 反転：オフホワイト

  background: '#fbfaf6',   // 背景：オフホワイト（紙風）
  backgroundCard: '#f5f1e8', // カード：少し金寄りのオフホワイト
  backgroundSoft: '#f0eee6', // カード強：少し濃いめ
  divider: '#d4cfc1',      // 区切り線：温かみのあるグレー
  dividerSoft: '#e3ddd0',  // 区切り線薄

  quote: '#3a4a6b',        // 引用：くすんだ紺
  quoteBg: '#eef0f5',      // 引用背景：青みのあるオフホワイト

  // カテゴリカラー（青系＋温色1点）
  catBlue: '#225366',      // 青：命術系
  catBlueBg: '#e3edf2',
  catSlate: '#345585',     // 紺：心理系
  catSlateBg: '#e6ebf3',
  catSand: '#8a6f4f',      // 砂色：ナラティブ系
  catSandBg: '#f3ece1',
  catCoral: '#b26d6a',     // 暖色：ハイライト1点
  catCoralBg: '#f5e6e3',

  // コールアウト
  calloutInfo: '#225366',
  calloutInfoBg: '#eef4f7',
  calloutWarn: '#a8843b',
  calloutWarnBg: '#fbf3df',
  calloutCore: '#0a1f44',
  calloutCoreBg: '#e9ecf3',
} as const;

// =============================================================================
// タイポグラフィスケール
// =============================================================================
export const fontSize = {
  cover: 32,    // 表紙メインタイトル
  h1: 22,       // 章タイトル
  h2: 16,       // セクション見出し
  h3: 13,       // サブ見出し
  body: 10.5,   // 本文
  small: 9,     // キャプション・引用元
  micro: 8,     // フッター・ページ番号
} as const;

// =============================================================================
// ページ余白・レイアウト共通
// =============================================================================
export const layout = {
  // 余白：本文の paddingBottom は フッター被り防止のため十分に確保（フッターは bottom:24 absolute）
  // フッター高さ ~12pt + マージン安全域 → paddingBottom = 56
  pageMargin: { top: 32, bottom: 56, left: 36, right: 36 },
  paragraphSpacing: 5,
  sectionSpacing: 10,
  chapterSpacing: 12,
} as const;

// =============================================================================
// グローバルスタイル（@react-pdf/renderer の StyleSheet）
// =============================================================================
export const styles = StyleSheet.create({
  // ページ
  page: {
    backgroundColor: colors.background,
    fontFamily: 'NotoSansJP',
    fontWeight: 400,   // 本文デフォルトをRegular固定（Boldへのフォールバック防止）
    fontSize: fontSize.body,
    color: colors.text,
    lineHeight: 1.55,  // 前: 1.75 → 縦密度UP
    paddingTop: layout.pageMargin.top,
    paddingBottom: layout.pageMargin.bottom,
    paddingLeft: layout.pageMargin.left,
    paddingRight: layout.pageMargin.right,
  },

  // 表紙ページ専用
  coverPage: {
    backgroundColor: colors.primary,
    color: colors.textInverse,
    fontFamily: 'NotoSansJP',
    paddingTop: 120,
    paddingBottom: 80,
    paddingLeft: 60,
    paddingRight: 60,
  },
  coverTitle: {
    fontSize: fontSize.cover,
    fontWeight: 700,
    color: colors.textInverse,
    marginBottom: 12,
    letterSpacing: 4,
  },
  coverSubtitle: {
    fontSize: fontSize.h2,
    color: colors.accent,
    marginBottom: 40,
    letterSpacing: 2,
  },
  coverDivider: {
    width: 64,
    height: 1,
    backgroundColor: colors.accent,
    marginBottom: 40,
  },
  coverName: {
    fontSize: fontSize.h1,
    fontWeight: 700,
    color: colors.textInverse,
    marginBottom: 8,
  },
  coverMeta: {
    fontSize: fontSize.body,
    color: colors.accentLight,
    marginBottom: 4,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 60,
    left: 60,
    right: 60,
    fontSize: fontSize.small,
    color: colors.accent,
    letterSpacing: 1,
  },

  // 章ヘッダー
  chapterNumberBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  chapterNumber: {
    fontSize: fontSize.small,
    fontWeight: 700,
    color: colors.accent,
    letterSpacing: 3,
    marginRight: 12,
  },
  chapterRule: {
    flexGrow: 1,
    height: 0.5,
    backgroundColor: colors.divider,
  },
  chapterTitle: {
    fontSize: fontSize.h1,
    fontWeight: 700,
    color: colors.primary,
    lineHeight: 1.5,
    marginTop: 4,
    marginBottom: 10,
    letterSpacing: 1,
  },
  chapterSubtitle: {
    fontSize: fontSize.small,
    color: colors.textSubtle,
    lineHeight: 1.4,
    marginBottom: 24,
    letterSpacing: 0.5,
  },

  // セクション見出し
  h2: {
    fontSize: fontSize.h2,
    fontWeight: 700,
    color: colors.primary,
    marginTop: layout.sectionSpacing,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  h3: {
    fontSize: fontSize.h3,
    fontWeight: 700,
    color: colors.primaryLight,
    marginTop: 12,
    marginBottom: 6,
  },

  // 本文
  body: {
    fontSize: fontSize.body,
    color: colors.text,
    marginBottom: layout.paragraphSpacing,
    lineHeight: 1.55,
  },
  bodyMuted: {
    fontSize: fontSize.body,
    color: colors.textSubtle,
    marginBottom: layout.paragraphSpacing,
    lineHeight: 1.55,
  },

  // 引用ブロック（リード文・本人の言葉）
  quote: {
    backgroundColor: colors.quoteBg,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingTop: 7,    // 前: 10
    paddingBottom: 7,
    paddingLeft: 12,
    paddingRight: 12,
    marginBottom: 10,  // 前: 14
    fontSize: fontSize.body,
    color: colors.quote,
    lineHeight: 1.65,  // 前: 1.85
  },

  // リスト項目
  listItem: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingLeft: 4,
  },
  listBullet: {
    fontSize: fontSize.body,
    color: colors.accent,
    marginRight: 8,
    width: 12,
  },
  listText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text,
    lineHeight: 1.7,
  },

  // 強調キーワード（インライン）
  strong: {
    fontWeight: 700,
    color: colors.primary,
  },

  // 命術データテーブル
  table: {
    marginTop: 8,
    marginBottom: 14,
    borderTopWidth: 0.5,
    borderTopColor: colors.divider,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.divider,
    paddingTop: 6,
    paddingBottom: 6,
  },
  tableLabel: {
    width: '32%',
    fontSize: fontSize.small,
    fontWeight: 700,
    color: colors.primaryLight,
    paddingRight: 8,
  },
  tableValue: {
    flex: 1,
    fontSize: fontSize.small,
    color: colors.text,
  },

  // カード（情報ブロック）
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 4,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: fontSize.h3,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 4,
  },
  cardBody: {
    fontSize: fontSize.body,
    color: colors.text,
    lineHeight: 1.7,
  },

  // フッター
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 52,
    right: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  footerLeft: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  footerRight: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },

  // 区切り
  hr: {
    height: 0.5,
    backgroundColor: colors.divider,
    marginTop: 8,
    marginBottom: 8,
  },
  hrAccent: {
    height: 1,
    backgroundColor: colors.accent,
    width: 40,
    marginTop: 6,
    marginBottom: 12,
  },

  // コールアウトボックス（情報強調）
  callout: {
    backgroundColor: colors.calloutInfoBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.calloutInfo,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 14,
    paddingRight: 14,
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 3,
  },
  calloutLabel: {
    fontSize: fontSize.small,
    fontWeight: 700,
    color: colors.calloutInfo,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  calloutBody: {
    fontSize: fontSize.body,
    color: colors.text,
    lineHeight: 1.6,
  },

  // 章扉カード（見出し直後の章テーマカード）
  chapterIntroCard: {
    backgroundColor: colors.calloutCoreBg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 16,
    marginBottom: 12,
    borderRadius: 4,
  },

  // キーワードチップ
  chip: {
    backgroundColor: colors.backgroundCard,
    borderColor: colors.accent,
    borderWidth: 0.5,
    borderRadius: 12,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: 700,
  },
});
