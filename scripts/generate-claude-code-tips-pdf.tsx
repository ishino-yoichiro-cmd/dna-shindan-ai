// Claude Code 初心者向け TIPS 7選 PDF（A4 1ページ）v3
// 課題ベース（共感・代弁）→ 解決 → コピペ の3段構成
// 英語コマンド一切なし、すべて日本語で指示できる内容のみ
// 出力先: ~/Downloads/ClaudeCodeOutput/claude-code-tips-{timestamp}.pdf

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { Document, Page, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { styles, colors, registerFonts } from '../src/components/pdf/styles';

registerFonts();

// =============================================================================
// 7つのTIPデータ（課題ベース・共感→解決→コピペ）
// =============================================================================

type Tip = {
  n: string;
  title: string; // 課題そのものをタイトルに
  pain: string; // 共感・代弁の問いかけ（サブ）
  body: string; // 解決策の本文
  copyLabel: string;
  copyLines: string[];
};

const TIPS: Tip[] = [
  {
    n: '01',
    title: 'AIに頼んでも、普通の答えしか返ってこない',
    pain: 'もっと自分にぴったりの答えがほしいのに…そんな手応えのなさ、感じていませんか？',
    body: 'AIは渡した情報の鏡。自分のことを徹底的に教えるだけで出力が一気に化ける。DNA診断のPDFがあれば最初に読ませる。',
    copyLabel: 'コピペして送る',
    copyLines: [
      '「添付は私の自己紹介です。',
      '価値観・口調・判断軸を学習し、',
      'この人格で応答してください」',
    ],
  },
  {
    n: '02',
    title: '毎回「許可していい？」で作業が止まる',
    pain: 'リズムが切れて、だんだん使うのが面倒になっていませんか？',
    body: '冒頭でひと言伝えるだけで、AIが自律的に進めてくれる。削除・本番反映・課金など戻せない操作だけは確認させる。',
    copyLabel: 'コピペして送る',
    copyLines: [
      '「削除・課金・送信以外は、',
      '都度確認せず最後まで',
      '実行してから結果を報告して」',
    ],
  },
  {
    n: '03',
    title: '発注内容や残タスクを忘れられて、また一から説明',
    pain: '「前に頼んだやつ、覚えてないの？」と心が折れそうになっていませんか？',
    body: 'AIは別チャットの履歴を持ち越せない仕様。区切りごとに「発注内容・要件・残タスクをメモリに保存して」と頼んでおけば、新しいチャットでも保存済みの前提から会話が再開できる。',
    copyLabel: 'コピペして送る',
    copyLines: [
      '「決定事項と残タスクを',
      'メモリに保存して。新規',
      'チャットでも続きから」',
    ],
  },
  {
    n: '04',
    title: 'API接続や画面操作で「どこを押せばいい？」と迷う',
    pain: '設定画面の前で固まって、文字で説明しきれずに諦めていませんか？',
    body: '迷ったら説明する前に画面キャプチャ（スクリーンショット）を貼る。AIは画像から状況・エラー・ボタン位置を直接読み取って具体的な手順を返してくれる。言葉で書く労力をまるごと省略できる最短手段。',
    copyLabel: '迷ったら撮って貼る',
    copyLines: [
      'Mac : Shift + ⌘ + 4 で範囲撮影',
      'Win : Win + Shift + S で範囲撮影',
      '画像を貼り付けて',
      '「具体的にわかりやすく説明して」',
    ],
  },
  {
    n: '05',
    title: '勝手に作業が進んで、違う方向にいってしまう',
    pain: '気づいたら全然違うものが出来上がっていた…経験、ありませんか？',
    body: '実行前に全工程を箇条書きで出させると、暴走を防げて軌道修正もしやすい。重い依頼ほどこの一手間が効く。',
    copyLabel: 'コピペして送る',
    copyLines: [
      '「着手前に作業手順を',
      '番号付きリストで提示して。',
      '承認後に実行開始してください」',
    ],
  },
  {
    n: '06',
    title: '使い続けるうちにAIの動きが鈍くなる',
    pain: '「最初より頭悪くなってない？」と思った瞬間、ありませんか？',
    body: '画面右下の使用量メーターが80%を超える前に、新規チャットに切り替える。直前にメモリ保存を頼んでおけば、自分の前提は引き継がれる。',
    copyLabel: '切替の合図',
    copyLines: [
      '右下のメーターが',
      '80% を超えたら',
      '新規チャットへ',
    ],
  },
  {
    n: '07',
    title: '気づかぬうちに使用量が激増している',
    pain: '「そんなに使ってないのに、なぜかメーターが減るのが早い…」と感じていませんか？',
    body: 'AIは毎ターン、これまでの会話を丸ごと読み直して応答する仕組み。一度貼った画像はそのセッション中、ターンが進むごとにフルで再読込されるため、続けるほど消費が一気に増え続ける。画像はパス（場所の住所）を文字で渡せば、AIは必要な時だけ見に行くので消費が劇的に減る。',
    copyLabel: '画像はパスで渡す',
    copyLines: [
      'Mac : Option + ⌘ + C',
      'Win : アドレスバーをコピー',
      'パスを文字で貼り付け',
    ],
  },
];

// =============================================================================
// レイアウト
// =============================================================================

// artist案B：モノグラム・スクエア（紺ベタ＋金大数字）— メリハリ強化版
const TipBadge = ({ n }: { n: string }) => (
  <View
    style={{
      width: 36,
      height: 36,
      backgroundColor: colors.primary,
      borderRadius: 2,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text
      style={{
        fontSize: 18,
        color: colors.accent,
        fontWeight: 700,
        letterSpacing: -0.3,
        lineHeight: 1,
      }}
    >
      {n}
    </Text>
  </View>
);

const CopyCard = ({ label, lines }: { label: string; lines: string[] }) => (
  <View
    style={{
      width: 152,
      backgroundColor: colors.background,
      borderWidth: 0.6,
      borderColor: colors.accent,
      paddingTop: 5,
      paddingBottom: 5,
      paddingLeft: 8,
      paddingRight: 8,
      justifyContent: 'center',
    }}
  >
    {/* ヘッダー：縦棒線とラベルの頭をflex-startで完全揃え */}
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
      }}
    >
      <View
        style={{
          width: 2,
          height: 7,
          backgroundColor: colors.accent,
          marginRight: 5,
          marginTop: 1,
        }}
      />
      <Text
        style={{
          fontSize: 7,
          color: colors.accent,
          letterSpacing: 0.8,
          fontWeight: 700,
          lineHeight: 1.15,
        }}
      >
        {label}
      </Text>
    </View>
    {lines.map((l, i) => (
      <Text
        key={i}
        style={{
          fontSize: 8,
          color: colors.primary,
          fontWeight: 700,
          lineHeight: 1.4,
        }}
      >
        {l}
      </Text>
    ))}
  </View>
);

const TipRow = ({ tip, isLast, isFirst }: { tip: Tip; isLast: boolean; isFirst: boolean }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingTop: isFirst ? 12 : 9,
      paddingBottom: 9,
      borderBottomWidth: isLast ? 0 : 0.4,
      borderBottomColor: colors.divider,
    }}
  >
    {/* 左：番号バッジ（エディトリアル・ナンバー） */}
    <View
      style={{
        width: 46,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        paddingTop: 3,
        paddingLeft: 2,
      }}
    >
      <TipBadge n={tip.n} />
    </View>

    {/* 中央：タイトル（課題）→ 問いかけ → 本文（解決） */}
    <View style={{ flex: 1, paddingRight: 10, justifyContent: 'center' }}>
      {/* タイトル（大・紺・太字）= 課題そのもの */}
      <Text
        style={{
          fontSize: 12,
          color: colors.primary,
          fontWeight: 700,
          letterSpacing: 0.4,
          marginBottom: 3,
          lineHeight: 1.3,
        }}
      >
        {tip.title}
      </Text>

      {/* 問いかけ（小・グレー・引用調）= 共感・代弁 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: 4,
          paddingLeft: 6,
          borderLeftWidth: 1,
          borderLeftColor: colors.accent,
        }}
      >
        <Text
          style={{
            fontSize: 7.8,
            color: colors.textSubtle,
            flex: 1,
            lineHeight: 1.45,
          }}
        >
          {tip.pain}
        </Text>
      </View>

      {/* 本文（解決策） */}
      <Text style={{ fontSize: 8.5, color: colors.text, lineHeight: 1.55 }}>{tip.body}</Text>
    </View>

    {/* 右：コピペ／キー操作カード */}
    <CopyCard label={tip.copyLabel} lines={tip.copyLines} />
  </View>
);

// =============================================================================
// 1ページ
// =============================================================================

const SinglePage = () => (
  <Page
    size="A4"
    style={[
      styles.page,
      { paddingTop: 0, paddingBottom: 26, paddingLeft: 28, paddingRight: 28 },
    ]}
  >
    {/* ヘッダー帯（紺地・金アクセント） */}
    <View
      style={{
        backgroundColor: colors.primary,
        paddingTop: 18,
        paddingBottom: 16,
        paddingLeft: 24,
        paddingRight: 24,
        marginLeft: -28,
        marginRight: -28,
        marginBottom: 4,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View
              style={{
                width: 18,
                height: 1,
                backgroundColor: colors.accent,
                marginRight: 8,
              }}
            />
            <Text
              style={{
                fontSize: 7.5,
                color: colors.accent,
                letterSpacing: 5,
                fontWeight: 700,
              }}
            >
              CLAUDE CODE STARTER GUIDE
            </Text>
          </View>
          <Text
            style={{
              fontSize: 20,
              color: colors.textInverse,
              fontWeight: 700,
              letterSpacing: 1.5,
              lineHeight: 1.25,
            }}
          >
            AIエージェントを乗りこなす{'\n'}7つのコツ
          </Text>
        </View>

        {/* 右：7TIPS バッジ（横並びレイアウトで文字被り解消） */}
        <View
          style={{
            paddingTop: 9,
            paddingBottom: 9,
            paddingLeft: 14,
            paddingRight: 14,
            borderWidth: 0.6,
            borderColor: colors.accent,
            alignItems: 'center',
            marginLeft: 14,
          }}
        >
          <Text
            style={{
              fontSize: 6,
              color: colors.accent,
              letterSpacing: 2.5,
              fontWeight: 700,
              marginBottom: 5,
            }}
          >
            FOR BEGINNERS
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={{
                fontSize: 22,
                color: colors.textInverse,
                fontWeight: 700,
                lineHeight: 1,
                marginRight: 5,
              }}
            >
              7
            </Text>
            <Text
              style={{
                fontSize: 9,
                color: colors.accentLight,
                letterSpacing: 2,
                fontWeight: 700,
              }}
            >
              TIPS
            </Text>
          </View>
        </View>
      </View>

      <Text
        style={{
          fontSize: 8,
          color: colors.accentLight,
          marginTop: 8,
          lineHeight: 1.5,
        }}
      >
        「もっとちゃんと使いこなせるはずなのに、なぜか手応えが薄い」— その違和感を、初日のうちに7つで解消する。
      </Text>
    </View>

    {/* 金の細罫 */}
    <View
      style={{
        height: 1.5,
        backgroundColor: colors.accent,
        marginTop: 0,
        marginBottom: 4,
        marginLeft: -28,
        marginRight: -28,
      }}
    />

    {/* TIP行 ×7 */}
    <View>
      {TIPS.map((t, i) => (
        <TipRow
          key={t.n}
          tip={t}
          isFirst={i === 0}
          isLast={i === TIPS.length - 1}
        />
      ))}
    </View>

    {/* クロージング */}
    <View
      style={{
        marginTop: 6,
        backgroundColor: colors.primary,
        paddingTop: 9,
        paddingBottom: 9,
        paddingLeft: 14,
        paddingRight: 14,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View
        style={{
          paddingRight: 10,
          borderRightWidth: 0.5,
          borderRightColor: colors.accent,
        }}
      >
        <Text
          style={{
            fontSize: 6.5,
            color: colors.accent,
            letterSpacing: 2.5,
            fontWeight: 700,
          }}
        >
          ONE MORE
        </Text>
        <Text
          style={{
            fontSize: 6.5,
            color: colors.accent,
            letterSpacing: 2.5,
            fontWeight: 700,
          }}
        >
          THING
        </Text>
      </View>
      <Text
        style={{
          fontSize: 8.8,
          color: colors.textInverse,
          lineHeight: 1.55,
          flex: 1,
          paddingLeft: 12,
        }}
      >
        AIは「指示の鏡」。出力品質はプロンプトの巧さではなく、
        <Text style={{ color: colors.accent, fontWeight: 700 }}>自分をどれだけ言語化できているか</Text>
        で決まる。分身AIを磨く時間は、そのまま自分を磨く時間になる。
      </Text>
    </View>

    {/* フッター */}
    <View
      style={{
        position: 'absolute',
        bottom: 10,
        left: 28,
        right: 28,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
      fixed
    >
      <Text
        style={{
          fontSize: 6.5,
          color: colors.textMuted,
          letterSpacing: 2.5,
          fontWeight: 700,
        }}
      >
        CLAUDE CODE TIPS / 7 ESSENTIALS
      </Text>
      <Text
        style={{
          fontSize: 6.5,
          color: colors.accent,
          letterSpacing: 3,
          fontWeight: 700,
        }}
      >
        PRODUCED BY YO
      </Text>
    </View>
  </Page>
);

// =============================================================================
// メイン
// =============================================================================

const Doc = () => (
  <Document
    title="Claude Code 初心者向け TIPS 7選"
    author="チーム11"
    subject="AIエージェントを乗りこなす7つのコツ"
  >
    <SinglePage />
  </Document>
);

async function main() {
  const ts = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d+Z$/, '')
    .replace('T', '-');
  const outDir = path.join(os.homedir(), 'Downloads', 'ClaudeCodeOutput');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `claude-code-tips-${ts}.pdf`);

  console.log('[1/2] PDFレンダリング中...');
  const buffer = await renderToBuffer(React.createElement(Doc));
  fs.writeFileSync(outPath, buffer);

  const stat = fs.statSync(outPath);
  console.log(`[2/2] 完了: ${outPath}`);
  console.log(`   サイズ: ${(stat.size / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error('[generate-claude-code-tips-pdf] FAILED:', e);
  process.exit(1);
});
