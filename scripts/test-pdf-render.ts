// PDFビジュアルチェック用：LLM生成 Markdown を全章に流し込み実PDFを生成
// 出力先：~/Downloads/ClaudeCodeOutput/dna-pdf-test-{timestamp}.pdf
//
// 検証観点：
//   1) フッターと本文の被り
//   2) 文章のページ途中切れ
//   3) {{CLONE_URL}} プレースホルダ置換の正常動作
//   4) シェア妨害文言が含まれないこと（chapter11/end の Markdown 中で）
//   5) 終章が「総括＋未来期待」トーンになっているか
//
// 実行：npx tsx scripts/test-pdf-render.ts

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { Report } from '../src/components/pdf/Report';
import { runAllCelestial } from '../src/lib/celestial';
import type { ReportProps } from '../src/components/pdf/types';
import type { CelestialInput } from '../src/lib/celestial';

// ===== process-pending と同じ {{CLONE_URL}} 置換ロジックを再現 =====
function applyCloneUrl(md: string, id: string): string {
  const url = `https://dna-shindan-ai.vercel.app/clone/${id}`;
  return md.replace(/\{\{\s*CLONE_URL\s*\}\}/g, url);
}

// ===== ダミーLLM Markdown（拡張記法のフル投入で全装飾検証） =====

const SAMPLE_USER_NAME = 'サンプル ユーザー';
const SAMPLE_ID = 'demo-user-001';

const COVER_MD = `> 30ページの設計図へようこそ。これからあなたという一人の人間を、16の命術と8つの心理軸とあなた自身の言葉から立体的に組み上げていく。

## あなたが生まれた日の宇宙の配置

その瞬間の星位・暦・気の流れは、二度と同じ組み合わせでは揃わない。あなたという組み合わせは、統計的にも本当に「一人だけ」の存在。

::: info
このレポートは順番通りに読まなくていい。いま気になる章から開いてほしい。
:::

::tag 一人だけ, 30ページ, 立体的設計, あなた専用 ::

## このレポートの読み方

全13章は、3つの層から組み上がっている。

1. **命術データ** — 数千年分の人類の観察記録
2. **心理スコア** — あなたが回答した40問から抽出された行動パターン
3. **あなた自身の言葉** — 自由記述5問で書いてもらった、生の輪郭

この3層を重ねたとき、初めて「あなた」が立体的に浮かび上がる。

---

ここから先に書かれているのは、占いではなく観察記録。淡々と読んでほしい。
`;

const CHAPTER1_MD = `> 数千年前から人類は、生まれた瞬間の天体や暦から、人の傾向を読もうとしてきた。それぞれは別々の文化で生まれたのに、不思議と同じ人について似たことを言う。

## 命術16の総覧

16の命術は、ルーツでざっくり5グループに分けて読める。

| グループ | 含まれる命術 | 観点 |
| --- | --- | --- |
| 陰陽五行系 | 四柱推命・算命学 | 五行と十干十二支のバランス |
| 星位系 | 西洋占星・紫微斗数 | 天体配置と命宮 |
| 数系 | 数秘・マヤ暦 | 生年月日からの数の意味 |
| 暦系 | 九星・宿曜・366日 | 暦と気の流れ |
| 独自構築系 | HD風・動物キャラ・春夏秋冬 ほか | 現代心理を含む系譜 |

## 3つの一致点

複数の命術が共通して指している性質トップ3：

1. **内省と発信のバランスを取る傾向** — 複数の命術が同方向を指す
2. **中長期で価値を積み上げる気質** — 短期勝負ではない設計
3. **人との距離設計に独自のリズムを持つ** — 関係性のメタ認知

## 2つの矛盾点

::: warn
命術同士が違うことを言っている部分。これが個性の輪郭を作る。
:::

- 集団リーダー型と単独行動型の指標が同居（場面で切り替える設計）
- 安定志向と変化志向のスコアが拮抗（時期による振れ幅が想定される）

## この設計が示す「核」

::: core
16の命術を横断して読むと、あなたの設計の核は「自分の感覚を確かめながら、外と接続する点を選ぶ」気質に集約される。情報を浴びるよりも、選んだ少数を深く扱うことで本領が出る。短期の派手さよりも、中期で複利が効く構造に向いている。
:::

::tag 内省, 構造化, 少数精鋭, 中期視点, 言語化, 美意識, 自律, 観察眼, 再現性, 深掘り ::

## 章の余韻

この10語は、これ以降の章で何度も顔を出す。あなたの輪郭そのもの。
`;

// 短めだが装飾を効かせた章
function buildChapterMd(chapterTitle: string, body: string): string {
  return `> ${chapterTitle}に関するリード文。あなたの中ですでに動いているものを言葉にして残す。

## ${chapterTitle}の構造

${body}

### 3つの観点

1. 観点A — 日常で繰り返し出てくる場面
2. 観点B — その場面であなたが選ぶパターン
3. 観点C — 結果として残る成果と感情の質

::: info
この章の核は、特別なことを足すのではなく、すでにある動きの輪郭を浮かび上がらせること。
:::

## 行動への落とし込み

- 来週から始められる小さな実験を1つ
- 1ヶ月で確認したい指標
- 3ヶ月後に見直すための問い

::: core
**${chapterTitle}** が、あなたの設計図において果たしている役割は他のどの章とも代替できない。
:::

---

次の章は、別の角度から同じあなたを照らす。
`;
}

const CHAPTER11_MD = `> このレポートを最後まで読んだあなたは、すでに「自分という人間の説明書」を手に入れている。でも、説明書を毎回読み返すのは現実的じゃない。

## 分身AIに移植したもの

ここまでの全ての情報を統合して、あなた自身として応答するAI分身を作った。

- 命術16の結果（あなたの根の設計）
- 心理スコア（行動パターンと判断基準）
- ナラティブ7問の回答（あなたの輪郭）
- 文体サンプル300字（言葉の温度）
- NG表現（避ける言葉）

## 分身AIができること

1. **壁打ち** — 判断に迷ったときに、あなた自身の価値観で考え直す
2. **人生相談** — 自分の落とし穴と強みを把握した相手として応答する
3. **文章チェック** — あなたの文体に合っているかを確認する
4. **自分との対話** — 未来のあなた／過去のあなたとして話す

## あなた専用URL

::: info
分身AIはこちら： {{CLONE_URL}}
{{CLONE_URL}} を開いて、最初の一言を投げてみてほしい。
あなたの分身が、あなたの代わりに考えはじめる。
:::

## 使い方サンプル3つ

- 迷ったとき：「Aの選択肢で気が乗らない理由を、自分の価値観に照らして整理して」
- 怒ったとき：「今この怒りは、自分のどの北極星が脅かされたから出てるか」
- 大事な決断のとき：「3年後の自分から見たら、今のこの選択はどう映る？」

## 分身AIへの初回プロンプト例

1. 今日あった出来事の中で、自分の核に響いた瞬間を1つ拾って言語化して
2. 今週のスケジュールを見て、消耗する予定が混ざってないか見て
3. 私の長所が裏目に出てる兆候、最近ある？
4. 次の3ヶ月で最優先すべきことを、私の価値観で並べ直して
5. 私が今、目を逸らしてることを言語化して

## シェアの推奨

このレポートと分身AIは「あなたを理解してほしい人」に渡すために設計されている。家族・友人・パートナー・上司・同僚に共有して構わない。むしろ共有が前提。

::: core
もう一人の自分に、いつでも会える。
:::
`;

const END_MD = `> ここまで読んでくれてありがとう。
> 30ページの設計図を、最後にひとつの言葉に束ねる。
> ここから先、あなたが歩いていく時間に持っていけるものとして。

## このレポートが描き出した「あなたという核」

全章で見えてきた "あなたという人" を、3つの核として総括する。

::: core
**核 1：感覚で確かめてから、外と接続する**
情報を浴びるよりも、選んだ少数を深く扱う気質。短期の派手さよりも、中期で複利が効く構造に向いている。
:::

::: core
**核 2：構造を見抜いて、そこに自分を置く**
目の前の現象の裏側を構造として理解する力。代えがきかない場所は、いつもそこから生まれる。
:::

::: core
**核 3：言葉で核を残し、時間と一緒に磨く**
書く・話す・残すは、あなたが自分自身を更新するための主回路。
:::

## これからのあなたへの期待

これまでの章は「現在のあなた」を解像度高く描いた。
ここからは、その核がこれから先、1年・3年・10年でどう進化していくかへの期待を書く。

- あなたの核は「完成形」ではなく「進化していく軸」である
- これから出会うであろう問いや転機は、あなたの設計を試すというより「あなたの設計が選んだ」もの
- 唯一無二の人生軌道を歩むことに、誰かと比較する必要はない
- このレポートの言葉は、未来のどこかで「あの時こう書かれていた意味」として立ち上がる

::: info
あなたの進化を、楽しみにしている。
:::

---

> このレポートは、いまこの瞬間のあなたの設計図。
> 1年後、3年後にもう一度開くと、違うところが響く。
> あなたの進化を、この30ページは静かに祝福している。
`;

async function main() {
  // 禁則チェック：本名に該当しない汎用名のみ使う
  const sampleInput: CelestialInput = {
    fullName: SAMPLE_USER_NAME,
    birthDate: '1985-05-15',
    birthTime: '14:30',
    birthPlace: {
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: 'Asia/Tokyo',
    },
    gender: 'male',
  };

  console.log('[1/4] 命術16計算中...');
  const celestial = await runAllCelestial(sampleInput);
  console.log(
    `   成功 ${celestial.meta.successCount} / 失敗 ${celestial.meta.failureCount} / ${celestial.meta.durationMs}ms`,
  );

  console.log('[2/4] LLM Markdown ダミー（CLONE_URL置換も検証）を準備中...');
  const llmContent: Record<string, string> = {
    cover: applyCloneUrl(COVER_MD, SAMPLE_ID),
    chapter1: applyCloneUrl(CHAPTER1_MD, SAMPLE_ID),
    chapter2: applyCloneUrl(buildChapterMd('才能の指紋', '息するように出来てしまうことを言葉にする。意識せずやれる動作の中に、最も再現性のある才能が眠っている。'), SAMPLE_ID),
    chapter3: applyCloneUrl(buildChapterMd('情熱の発火点', '時間を忘れる瞬間の構造を観察する。それが起こる条件を分解できれば、自分で再現できる燃料源になる。'), SAMPLE_ID),
    chapter4: applyCloneUrl(buildChapterMd('価値観のコンパス', '怒りと違和感が指し示す北極星を読み取る。判断に迷ったとき、ここに戻ればだいたい正しい方向が見える。'), SAMPLE_ID),
    chapter5: applyCloneUrl(buildChapterMd('愛し方・愛され方', '安心できる関係性の形を、抽象論ではなく具体的な行動と言葉のレベルで定義する。'), SAMPLE_ID),
    chapter6: applyCloneUrl(buildChapterMd('ビジネスでの輝き方', '市場で「代えがきかない」と言われる場所を特定する。そこを出発点にした方が、結果は早く付いてくる。'), SAMPLE_ID),
    chapter7: applyCloneUrl(buildChapterMd('人生のグランドデザイン', 'IKIGAIフレームと5年先の地図を重ねる。今日の意思決定がどこに繋がっているかが見える。'), SAMPLE_ID),
    chapter8: applyCloneUrl(buildChapterMd('成長の道標', '3ヶ月・1年・3年の「やること」をたった9個に絞る。多すぎる目標は、結局どれも届かない。'), SAMPLE_ID),
    chapter9: applyCloneUrl(buildChapterMd('あなたの落とし穴', '同じ強みが、同じ場所で逆向きに働く。それを事前に把握しておけば、転んだ時に立ち直りが早い。'), SAMPLE_ID),
    chapter10: applyCloneUrl(buildChapterMd('運気カレンダー', '12ヶ月先までのバイオリズムを置く。攻める月・休む月・転換月を予め予定に入れておく。'), SAMPLE_ID),
    chapter11: applyCloneUrl(CHAPTER11_MD, SAMPLE_ID),
    end: applyCloneUrl(END_MD, SAMPLE_ID),
  };

  // 検証：プレースホルダ残存チェック
  for (const [k, v] of Object.entries(llmContent)) {
    if (v.includes('{{CLONE_URL}}')) {
      throw new Error(`プレースホルダ未置換: ${k}`);
    }
  }
  console.log('   {{CLONE_URL}} 置換 OK（全章で残存なし）');

  // シェア妨害文言の検出
  const NG_PHRASES = ['他人には渡さない', 'シェアしない方がいい', '秘密にすべき', '内側がそのまま反映されているから'];
  for (const [k, v] of Object.entries(llmContent)) {
    for (const ng of NG_PHRASES) {
      if (v.includes(ng)) {
        throw new Error(`シェア妨害文言検出: ${k} に「${ng}」`);
      }
    }
  }
  console.log('   シェア妨害文言 なし（ダミーMarkdown検証）');

  const props: ReportProps = {
    celestial,
    scores: {
      bigFive: { O: 78, C: 65, E: 42, A: 70, N: 38 },
      bigFiveType: '深掘り型探究家',
      enneagram: { primary: 5, wing: 4 },
      riasec: {
        R: 25, I: 80, A: 72, S: 55, E: 48, C: 58,
        top3: ['I（探究）', 'A（芸術）', 'C（慣習）'],
      },
      vak: { V: 42, A: 28, K: 30 },
      attachment: 'secure',
      loveLanguage: { time: 35, words: 15, touch: 15, gifts: 10, acts: 25 },
      entrepreneur: { primary: '構築家タイプ', secondary: '探究家タイプ' },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    llmContent: llmContent as any,
    userInfo: {
      fullName: SAMPLE_USER_NAME,
      birthDate: '1985-05-15',
      birthTime: '14:30',
      birthPlace: '東京都',
      email: 'sample@example.com',
      styleSample:
        '何かを書こうとするとき、いつも入口で迷う。書きたいことは決まっているのに、最初の一行が浮かばない。それでも数分置いてから戻ると、不思議と最初の一文がするりと出てくる。',
      ngExpressions: ['意識高い系の言葉', '断定すぎる占い口調'],
    },
    relationshipTag: 'マブダチ',
  };

  // 出力先
  const outDir = path.join(os.homedir(), 'Downloads', 'ClaudeCodeOutput');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const outPath = path.join(outDir, `dna-pdf-test-${ts}.pdf`);

  console.log('[3/4] PDFレンダリング中...');
  const buffer = await renderToBuffer(React.createElement(Report, props));
  fs.writeFileSync(outPath, buffer);

  const stat = fs.statSync(outPath);
  const sizeKb = (stat.size / 1024).toFixed(1);
  console.log(`[4/4] PDF生成完了: ${outPath}`);
  console.log(`   サイズ: ${sizeKb} KB`);
  console.log(`   ※ ページ数確認: mdls -name kMDItemNumberOfPages "${outPath}"`);
  console.log(`   ※ 開く: open "${outPath}"`);
}

main().catch((e) => {
  console.error('[test-pdf-render] FAILED:', e);
  process.exit(1);
});
