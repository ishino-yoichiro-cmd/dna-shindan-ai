// 7章：人生のグランドデザイン（3p）
// データソース：1〜6章統合 + Q33/Q36 + バイオリズム・マヤ流れ

import React from 'react';
import { Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import {
  ChapterHeader,
  Quote,
  Paragraph,
  SectionTitle,
  ChapterFooter,
  Card,
  AccentRule,
} from '../common';
import type { ReportProps } from '../types';

const FALLBACK_LEAD = `IKIGAIは「好き×得意×社会の役に立つ×お金になる」の交差点と言われる。この4つの円の重なり方は、人によって全然違う。誰かのIKIGAIを真似しても、自分の重なりにはならない。
この章では、ここまで読んできたあなたの素質・才能・情熱・価値観・職業適性を全部重ねて、あなただけのIKIGAIマップを作る。さらに、それを5年というタイムラインに落として、節目ごとの目印を置く。`;

const FALLBACK_IKIGAI = {
  likes: ['本を読む時間', '人と一対一で深く話すこと', '構造を図に起こす作業'],
  skills: ['複雑なものを整理する', '違和感を言語化する', '中期で計画を組む'],
  world: ['学びを必要とする人へ届ける', '対話の場を作る', '小さな成功例を体系化する'],
  money: ['知的サービス（コンサル・教育）', 'コンテンツ販売', '少人数ワークショップ'],
};

const FALLBACK_KEYWORDS = ['知の編集者', '深い対話', '中期の伴走'];

const FALLBACK_ROADMAP = [
  { year: 1, goal: '自分の専門領域の輪郭を、3,000字×10本の文章で固定する' },
  { year: 2, goal: '少人数の継続クライアント3名と、半年単位の伴走を積み上げる' },
  { year: 3, goal: 'コンセプトを形にした代表作（書籍 or 体系教材）を出す' },
  { year: 4, goal: 'チームを2〜3名に拡張し、自分の手を離せる業務を作る' },
  { year: 5, goal: '複数の収入源と「自分が動かなくても回る」構造を完成させる' },
];

export function Chapter7Design({ llmContent }: ReportProps) {
  const lead = llmContent.chapter7?.leadText ?? FALLBACK_LEAD;
  const ikigai = llmContent.chapter7?.ikigai ?? FALLBACK_IKIGAI;
  const keywords = llmContent.chapter7?.keywords ?? FALLBACK_KEYWORDS;
  const fiveYear =
    llmContent.chapter7?.fiveYearVision ??
    'あなたが書いた5年後の未来は、「無理せず深い仕事をしている自分」の輪郭をしている。';
  const roadmap = llmContent.chapter7?.roadmap ?? FALLBACK_ROADMAP;
  const turning =
    llmContent.chapter7?.turningPoint ??
    'バイオリズム年間カレンダーで「転換月」と読める時期に、生活拠点・契約形態・主要案件を見直すと自然な流れに乗れる。';
  const futureLine =
    llmContent.chapter7?.futureLine ??
    '5年後のあなたは、自分の言葉で自分の仕事を説明できるようになっている。';

  const block = (title: string, items: string[], bg: string) => (
    <View style={{ width: '48%', backgroundColor: bg, padding: 10, borderRadius: 4, marginBottom: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primary, marginBottom: 4 }}>{title}</Text>
      {items.map((s, i) => (
        <Text key={i} style={{ fontSize: 9, color: colors.text, marginBottom: 2 }}>・{s}</Text>
      ))}
    </View>
  );

  return (
    <>
      <Page size="A4" style={styles.page}>
        <ChapterHeader index="第7章 / CHAPTER 07" title="人生のグランドデザイン" subtitle="あなたのIKIGAIと、5年先の地図" />

        <Quote>{lead}</Quote>

        <SectionTitle>あなたのIKIGAI ─ 4つの輪</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {block('好き', ikigai.likes, colors.backgroundCard)}
          {block('得意', ikigai.skills, colors.backgroundCard)}
          {block('社会の役に立つ', ikigai.world, colors.backgroundCard)}
          {block('お金になる', ikigai.money, colors.backgroundCard)}
        </View>

        <ChapterFooter chapterLabel="第7章 / Design" />
      </Page>

      <Page size="A4" style={styles.page}>
        <SectionTitle>4つの輪の交差点 ─ あなたのIKIGAIキーワード3つ</SectionTitle>
        <View style={{ flexDirection: 'row', marginTop: 6, marginBottom: 12 }}>
          {keywords.map((k, i) => (
            <View
              key={i}
              style={{
                backgroundColor: colors.primary,
                paddingTop: 6,
                paddingBottom: 6,
                paddingLeft: 14,
                paddingRight: 14,
                borderRadius: 14,
                marginRight: 8,
              }}
            >
              <Text style={{ color: colors.textInverse, fontSize: 11, fontWeight: 700 }}>{k}</Text>
            </View>
          ))}
        </View>

        <SectionTitle>あなたが書いた5年後</SectionTitle>
        <Paragraph>{fiveYear}</Paragraph>

        <SectionTitle>5年ロードマップ</SectionTitle>
        {roadmap.map((r) => (
          <Card key={r.year} title={`Year ${r.year}`}>
            <Text style={styles.cardBody}>{r.goal}</Text>
          </Card>
        ))}

        <ChapterFooter chapterLabel="第7章 / Design" />
      </Page>

      <Page size="A4" style={styles.page}>
        <SectionTitle>命術が示すターニングポイント</SectionTitle>
        <Paragraph>{turning}</Paragraph>

        <SectionTitle>5年後のあなたへの一行</SectionTitle>
        <Card>
          <Text style={[styles.cardBody, { fontWeight: 700, fontSize: 13 }]}>{futureLine}</Text>
        </Card>

        <AccentRule />
        <Paragraph muted>誰かのIKIGAIを真似しても、自分の重なりにはならない。</Paragraph>

        <ChapterFooter chapterLabel="第7章 / Design" />
      </Page>
    </>
  );
}
