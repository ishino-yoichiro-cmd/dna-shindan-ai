// 8章：成長の道標（2.5p）
// データソース：1〜7章統合 + エニア成長 + Big5変えやすい因子 + バイオリズム3ヶ月

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
  Bullet,
  AccentRule,
} from '../common';
import type { ReportProps } from '../types';

const FALLBACK_LEAD = `自己理解だけで人生は変わらない。理解→行動→変化のサイクルが回って初めて意味がある。
この章では、ここまで言語化してきたあなたの素質・課題・方向性をもとに、「3ヶ月でやる3つ」「1年でやる3つ」「3年でやる3つ」の合計9個の具体行動を提示する。多すぎず、少なすぎず、これだけ。`;

const FALLBACK_3M = [
  '今週から、朝の90分を「考える時間」として固定する',
  '今月中に、自分の専門領域を1,000字で言語化する',
  '3ヶ月以内に、対面で深く話す約束を3件入れる',
];
const FALLBACK_1Y = [
  '少人数の継続案件を3つに絞り、消耗する案件は手放す',
  '自分の体系を整理した教材プロトタイプを1つ作る',
  '1年に1度の長期休暇を計画に入れて、戦略を見直す時間を確保する',
];
const FALLBACK_3Y = [
  '代表作（書籍・体系教材・コミュニティ）を世に出す',
  '自分が動かなくても回る業務構造を半分作る',
  '次の3年で関わりたい人と、最初の対話を始める',
];

const FALLBACK_DONT = [
  '即レス文化に巻き込まれる仕事',
  '自分が中身を理解していない案件の受注',
  '価値観が合わない関係性の延命',
];

export function Chapter8Roadmap({ llmContent }: ReportProps) {
  const lead = llmContent.chapter8?.leadText ?? FALLBACK_LEAD;
  const m3 = llmContent.chapter8?.threeMonths ?? FALLBACK_3M;
  const y1 = llmContent.chapter8?.oneYear ?? FALLBACK_1Y;
  const y3 = llmContent.chapter8?.threeYears ?? FALLBACK_3Y;
  const dont = llmContent.chapter8?.dontList ?? FALLBACK_DONT;
  const summary =
    llmContent.chapter8?.summaryLine ??
    '構造化された静けさの中で、深く長く考え続けたい人。それがあなた。';

  const block = (title: string, items: string[]) => (
    <View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: colors.primary,
          marginTop: 12,
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 4 }}>
          <Text style={{ fontSize: 10, color: colors.accent, fontWeight: 700, marginRight: 8, width: 18 }}>0{i + 1}</Text>
          <Text style={{ flex: 1, fontSize: 10, color: colors.text, lineHeight: 1.7 }}>{it}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <>
      <Page size="A4" style={styles.page}>
        <ChapterHeader index="第8章 / CHAPTER 08" title="成長の道標" subtitle="3ヶ月・1年・3年でやること、たった9個" />

        <Quote>{lead}</Quote>

        {block('3ヶ月でやる3つ（即行動できる粒度）', m3)}
        {block('1年でやる3つ（環境変更・スキル習得・関係性構築）', y1)}

        <ChapterFooter chapterLabel="第8章 / Roadmap" />
      </Page>

      <Page size="A4" style={styles.page}>
        {block('3年でやる3つ（人生軸の大転換・代表作・拠点）', y3)}

        <SectionTitle>やらないことリスト</SectionTitle>
        {dont.map((d, i) => (
          <Bullet key={i}>{d}</Bullet>
        ))}

        <SectionTitle>つまずいたら戻る場所</SectionTitle>
        <Card>
          <Text style={[styles.cardBody, { fontWeight: 700 }]}>{summary}</Text>
        </Card>

        <AccentRule />
        <Paragraph muted>多すぎず、少なすぎず、9つだけ。</Paragraph>

        <ChapterFooter chapterLabel="第8章 / Roadmap" />
      </Page>
    </>
  );
}
