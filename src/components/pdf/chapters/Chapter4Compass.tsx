// 4章：価値観のコンパス（2p）
// データソース：Q32(怒り)/Q34(信念) + Q18/Q21 + 算命学・四柱・エニア

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

const FALLBACK_LEAD = `価値観を聞かれて答えられる人は少ない。でも、「許せないこと」と「絶対に曲げないこと」を聞くと、ほぼ全員が即答できる。価値観はポジティブな顔をしていない。怒りと違和感の形をして、あなたの内側に住んでいる。
この章は、あなたが書いた「怒り」と「譲れない信念」から、あなたの本当の北極星を3つに絞って取り出す。これがあなたの判断基準であり、生きる軸。`;

const FALLBACK_ANGER = [
  '本気で怒った場面 1：理不尽が放置されている瞬間',
  '本気で怒った場面 2：時間を雑に扱われた瞬間',
];

const FALLBACK_BELIEFS = [
  '譲れない信念 1：相手に敬意を持って関わる',
  '譲れない信念 2：自分の判断基準を他人に委ねない',
  '譲れない信念 3：時間と気持ちは透明に扱う',
];

const FALLBACK_CORE = ['誠実さ', '自律', '深さ'];

export function Chapter4Compass({ celestial, llmContent }: ReportProps) {
  const lead = llmContent.chapter4?.leadText ?? FALLBACK_LEAD;
  const anger = llmContent.chapter4?.angerExcerpts ?? FALLBACK_ANGER;
  const beliefs = llmContent.chapter4?.beliefs ?? FALLBACK_BELIEFS;
  const core = llmContent.chapter4?.coreValues ?? FALLBACK_CORE;
  const rule =
    llmContent.chapter4?.decisionRule ??
    '迷ったら、「3つの核（誠実さ・自律・深さ）」を一つでも削る選択をしない方を選ぶ。';

  const sanmeiMain = !('error' in celestial.sanmei) ? celestial.sanmei.mainStar : null;
  const shichuDay = !('error' in celestial.shichu) ? celestial.shichu.dayPillar : null;

  return (
    <>
      <Page size="A4" style={styles.page}>
        <ChapterHeader index="第4章 / CHAPTER 04" title="価値観のコンパス" subtitle="怒りと違和感が指し示す、あなたの北極星" />

        <Quote>{lead}</Quote>

        <SectionTitle>あなたが本気で怒ったとき</SectionTitle>
        {anger.map((a, i) => (
          <Bullet key={i}>{a}</Bullet>
        ))}

        <SectionTitle>譲れない信念3つ</SectionTitle>
        {beliefs.map((b, i) => (
          <Bullet key={i}>{b}</Bullet>
        ))}

        <ChapterFooter chapterLabel="第4章 / Compass" />
      </Page>

      <Page size="A4" style={styles.page}>
        <SectionTitle>怒りと信念から見える「核の価値観」</SectionTitle>
        <Paragraph muted>
          怒りは価値観の影、信念はその表側。両方を重ねると、どこにも譲れない芯が3つに収斂する。
        </Paragraph>
        {core.map((c, i) => (
          <Card key={i} title={`核の価値観 ${i + 1}：${c}`}>
            <Text style={styles.cardBody}>
              この価値が脅かされたとき、あなたは反射的に動く。判断はもう終わっている。
            </Text>
          </Card>
        ))}

        <SectionTitle>命術が示す価値構造</SectionTitle>
        <Paragraph>
          {sanmeiMain ? `算命学の主星は「${sanmeiMain}」。価値観の根に流れる気質を象徴する。` : ''}
          {shichuDay ? `四柱推命の日柱は「${shichuDay}」。あなた自身の核を表す位置に出ているサインを、信念のテーマと照らすと、ほぼ同じ方向を指している。` : ''}
        </Paragraph>

        <SectionTitle>判断に迷ったときの一行ルール</SectionTitle>
        <Card>
          <Text style={[styles.cardBody, { fontWeight: 700 }]}>{rule}</Text>
        </Card>

        <AccentRule />
        <Paragraph muted>怒りを否定せず、価値観の表れとして読む。</Paragraph>

        <ChapterFooter chapterLabel="第4章 / Compass" />
      </Page>
    </>
  );
}
