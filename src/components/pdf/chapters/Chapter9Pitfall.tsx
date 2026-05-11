// 9章：あなたの落とし穴（2p）
// データソース：1章矛盾 + Q12/Q27/Q32 + エニア暗黒面 + 四柱忌神

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
  AccentRule,
} from '../common';
import type { ReportProps } from '../types';

const FALLBACK_LEAD = `あなたの強みは、強すぎると弱みになる。情熱的な人は燃え尽き、論理的な人は冷たく見られ、優しい人は搾取される。落とし穴は外から来ない。あなたの長所が、特定の条件で反転して、あなた自身を倒す。
この章は、命術と心理データの「矛盾点」と、あなたが書いた怒り・失敗時の感情パターンから、あなた専用の落とし穴を3つに絞って言語化する。落ちないためじゃなく、落ちたときに早く気づくための地図。`;

const FALLBACK_PITFALLS = [
  {
    situation: '深く考える力が、考えすぎて動けない状態に反転する',
    sign: '「もう少し情報が揃ってから」が3回以上口から出る',
    escape: '24時間タイマーで強制的に動く。完璧でなくていい、80%で出す',
  },
  {
    situation: '誠実さが、相手の都合を背負いすぎる方向に反転する',
    sign: '断る前に「でも相手は」と相手側の事情を先に考える',
    escape: '「自分の限界線」を紙に書く。線を越える依頼は理由なしで断っていい',
  },
  {
    situation: '深い対話への欲求が、合わない人に時間を使いすぎる方向に反転する',
    sign: '会話のあと、自分の中に違和感だけが残るのに「次もまた会う」と決めている',
    escape: '会った後の自分の気分を5段階でメモする。3以下が2回続いたら距離を取る',
  },
];

export function Chapter9Pitfall({ llmContent }: ReportProps) {
  const lead = llmContent.chapter9?.leadText ?? FALLBACK_LEAD;
  const pitfalls = llmContent.chapter9?.threePitfalls ?? FALLBACK_PITFALLS;
  const phrase =
    llmContent.chapter9?.selfPhrase ??
    'あ、また「もう少し情報が揃ってから」やってる。';

  return (
    <>
      <Page size="A4" style={styles.page}>
        <ChapterHeader index="第9章 / CHAPTER 09" title="あなたの落とし穴" subtitle="同じ強みが、同じ場所であなたを倒す" />

        <Quote>{lead}</Quote>

        <SectionTitle>3つの落とし穴</SectionTitle>
        {pitfalls.slice(0, 2).map((p, i) => (
          <Card key={i} title={`落とし穴 ${i + 1}：${p.situation}`}>
            <Text style={[styles.cardBody, { marginBottom: 4 }]}>
              <Text style={{ fontWeight: 700 }}>兆候　</Text>
              {p.sign}
            </Text>
            <Text style={styles.cardBody}>
              <Text style={{ fontWeight: 700 }}>抜け方　</Text>
              {p.escape}
            </Text>
          </Card>
        ))}

        <ChapterFooter chapterLabel="第9章 / Pitfall" />
      </Page>

      <Page size="A4" style={styles.page}>
        {pitfalls.slice(2).map((p, i) => (
          <Card key={i} title={`落とし穴 ${i + 3}：${p.situation}`}>
            <Text style={[styles.cardBody, { marginBottom: 4 }]}>
              <Text style={{ fontWeight: 700 }}>兆候　</Text>
              {p.sign}
            </Text>
            <Text style={styles.cardBody}>
              <Text style={{ fontWeight: 700 }}>抜け方　</Text>
              {p.escape}
            </Text>
          </Card>
        ))}

        <SectionTitle>落ちたときの一行</SectionTitle>
        <Card>
          <Text style={[styles.cardBody, { fontWeight: 700, fontSize: 13 }]}>{phrase}</Text>
        </Card>

        <AccentRule />
        <Paragraph muted>落ちる前に、これを思い出せばいい。落ちないためじゃなく、早く気づくための地図。</Paragraph>

        <ChapterFooter chapterLabel="第9章 / Pitfall" />
      </Page>
    </>
  );
}
