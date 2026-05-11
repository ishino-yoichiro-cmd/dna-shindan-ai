// 3章：情熱の発火点（2.5p）
// データソース：Q31/Q33 + マヤ・西洋月・宿曜 + エニア・VAK

import React from 'react';
import { Page, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
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

const FALLBACK_LEAD = `情熱は精神論じゃない。あなたという生体が、特定の条件下で勝手にスイッチが入る現象。その条件さえ言語化できれば、再現できる。
この章では、あなたが書いた「夢中体験」3つを構造分解する。場所・時間帯・一人かチームか・身体感覚・終わった後の余韻——どこに発火点があるか、パターンが見えてくる。あなたが日常でこの条件を満たせるなら、人生はずいぶん楽になる。`;

const FALLBACK_EXP = [
  '没入した経験 1：時間を忘れて手を動かしていた場面',
  '没入した経験 2：誰にも言われずに調べ続けていた対象',
  '没入した経験 3：気づいたら朝になっていた一夜',
];

const FALLBACK_CONDITIONS = [
  '一人 × 構造化された問題 × 朝〜午前',
  '少人数 × 創造的なアウトプット × 夜の静かな時間',
  '身体を使う × 結果がすぐ見える × 締切がある',
];

export function Chapter3Passion({ celestial, llmContent }: ReportProps) {
  const lead = llmContent.chapter3?.leadText ?? FALLBACK_LEAD;
  const experiences = llmContent.chapter3?.immersionExperiences ?? FALLBACK_EXP;
  const conditions = llmContent.chapter3?.threeConditions ?? FALLBACK_CONDITIONS;
  const weekly =
    llmContent.chapter3?.weeklyDesign ??
    '週の平日のうち、午前の2時間を「一人で考える時間」として固定する。会議も連絡も入れない。これだけで、燃える条件の一つは毎週満たせる。';

  const moonSign = !('error' in celestial.seiyou) ? celestial.seiyou.moon.sign : null;
  const xiu = !('error' in celestial.shukuyou) ? celestial.shukuyou.xiu27 : null;
  const mayaGlyph = !('error' in celestial.maya) ? celestial.maya.glyph : null;

  return (
    <>
      <Page size="A4" style={styles.page}>
        <ChapterHeader index="第3章 / CHAPTER 03" title="情熱の発火点" subtitle="あなたが我を忘れる、その瞬間の構造" />

        <Quote>{lead}</Quote>

        <SectionTitle>あなたが書いた夢中体験</SectionTitle>
        {experiences.map((e, i) => (
          <Bullet key={i}>{e}</Bullet>
        ))}

        <SectionTitle>発火条件の構造分解</SectionTitle>
        <Paragraph>
          一人かチームか、創造か解決か、身体使用度、時間帯、場所——これらの軸であなたの夢中体験を分解すると、共通する「型」が浮かび上がる。本人にとっては「たまたま乗った日」でも、データで見ると条件は揃っている。
        </Paragraph>

        <ChapterFooter chapterLabel="第3章 / Passion" />
      </Page>

      <Page size="A4" style={styles.page}>
        <SectionTitle>命術と一致するか</SectionTitle>
        <Paragraph muted>
          {moonSign ? `西洋占星の月星座は「${moonSign}」。情緒の燃料となる場面。` : ''}
          {xiu ? `宿曜の宿は「${xiu}」、` : ''}
          {mayaGlyph ? `マヤ暦の紋章は「${mayaGlyph}」。` : ''}
          これらは命術が示す「あなたが満たされる条件」のヒント。あなた自身の夢中体験の型と重なる部分があれば、それは設計レベルで深い欲求。
        </Paragraph>

        <SectionTitle>あなたが燃える3つの条件</SectionTitle>
        {conditions.map((c, i) => (
          <Card key={i} title={`条件 ${i + 1}`}>
            <Text style={styles.cardBody}>{c}</Text>
          </Card>
        ))}

        <SectionTitle>日常でこの条件を満たす実装案</SectionTitle>
        <Paragraph>{weekly}</Paragraph>

        <AccentRule />
        <Paragraph muted>燃えるのを待つのではなく、燃やす条件を設計する。</Paragraph>

        <ChapterFooter chapterLabel="第3章 / Passion" />
      </Page>
    </>
  );
}
