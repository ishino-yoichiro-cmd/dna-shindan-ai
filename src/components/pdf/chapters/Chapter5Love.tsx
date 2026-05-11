// 5章：愛し方・愛され方（2p）
// データソース：愛情表現5タイプ・アタッチメント + Q13/Q25 + 紫微夫妻宮・西洋金星

import React from 'react';
import { Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import {
  ChapterHeader,
  Quote,
  Paragraph,
  SectionTitle,
  ChapterFooter,
  Bullet,
  AccentRule,
  DataTable,
} from '../common';
import type { ReportProps } from '../types';

const FALLBACK_LEAD = `「愛されたい」じゃなくて、「自分が愛だと感じる行動の種類」が人それぞれ違う。同じハグでも、ある人にとっては最大の愛で、ある人にとっては逆にプレッシャー。
この章では、愛情表現5タイプとアタッチメントスタイルから、あなたが「愛されてる」と感じる行動の種類を特定する。人間関係でモヤついてきた人ほど、ここで答え合わせができる。`;

const FALLBACK_MAX = [
  '一緒にいる時間を「先に」確保してくれる',
  '何があっても判断を最後まで聞いてくれる',
  '迷ったとき、選択肢を整理して横で考えてくれる',
];
const FALLBACK_DRAIN = [
  '感情を強く押し出される（説明前に泣かれる等）',
  '即レス文化の強要',
  '段取りなしで巻き込まれる',
];

function bar(label: string, value: number, max = 100) {
  const w = Math.min(value, max);
  return (
    <View style={{ marginBottom: 5 }}>
      <View style={{ flexDirection: 'row', marginBottom: 2 }}>
        <Text style={{ fontSize: 9, color: colors.text, width: 70 }}>{label}</Text>
        <Text style={{ fontSize: 9, color: colors.textSubtle }}>{value}</Text>
      </View>
      <View style={{ height: 6, backgroundColor: colors.divider, borderRadius: 3 }}>
        <View
          style={{
            width: `${w}%`,
            height: 6,
            backgroundColor: colors.accent,
            borderRadius: 3,
          }}
        />
      </View>
    </View>
  );
}

export function Chapter5Love({ celestial, scores, llmContent }: ReportProps) {
  const lead = llmContent.chapter5?.leadText ?? FALLBACK_LEAD;
  const profile =
    llmContent.chapter5?.loveProfile ??
    'あなたは「時間」と「行動」で愛を確かめるタイプ。言葉や物より、相手が時間を割いてくれること、行動で示してくれることに反応する。';
  const attach =
    llmContent.chapter5?.attachmentLine ??
    'アタッチメントは「安定」寄り。距離を詰めることも引くことも自分のペースで選べる柔らかさがある。';
  const maxActions = llmContent.chapter5?.maxActions ?? FALLBACK_MAX;
  const drain = llmContent.chapter5?.drainActions ?? FALLBACK_DRAIN;

  const ll = scores.loveLanguage ?? { time: 35, words: 15, touch: 15, gifts: 10, acts: 25 };

  const venusInfo = !('error' in celestial.seiyou)
    ? celestial.seiyou.planets.find((p) => p.key === 'venus')
    : null;
  const ziweiSpouse = !('error' in celestial.ziwei)
    ? celestial.ziwei.palaces.find((p) => p.name.includes('夫妻') || p.name.includes('夫婦'))
    : null;

  const meishuRows: { label: string; value: string }[] = [];
  if (venusInfo) {
    meishuRows.push({ label: '西洋占星：金星', value: `${venusInfo.sign}（${venusInfo.degree.toFixed(1)}度）` });
  }
  if (ziweiSpouse) {
    meishuRows.push({
      label: '紫微：夫妻宮',
      value: ziweiSpouse.majorStars.map((s) => s.name).join(' / ') || '主星なし',
    });
  }

  return (
    <>
      <Page size="A4" style={styles.page}>
        <ChapterHeader index="第5章 / CHAPTER 05" title="愛し方・愛され方" subtitle="あなたが安心するときの、関係性の形" />

        <Quote>{lead}</Quote>

        <SectionTitle>愛情表現プロファイル</SectionTitle>
        <Paragraph>{profile}</Paragraph>
        <View style={{ marginTop: 6, marginBottom: 14 }}>
          {bar('時間', ll.time)}
          {bar('言葉', ll.words)}
          {bar('接触', ll.touch)}
          {bar('贈り物', ll.gifts)}
          {bar('行動', ll.acts)}
        </View>

        <SectionTitle>アタッチメントスタイル</SectionTitle>
        <Paragraph>{attach}</Paragraph>

        <ChapterFooter chapterLabel="第5章 / Love" />
      </Page>

      <Page size="A4" style={styles.page}>
        <SectionTitle>命術と一致するか</SectionTitle>
        {meishuRows.length > 0 && <DataTable rows={meishuRows} />}

        <SectionTitle>パートナー・家族・親友に「これしてくれたら最大値」</SectionTitle>
        {maxActions.map((a, i) => (
          <Bullet key={i}>{a}</Bullet>
        ))}

        <SectionTitle>逆にあなたが消耗する関わり方</SectionTitle>
        {drain.map((d, i) => (
          <Bullet key={i}>{d}</Bullet>
        ))}

        <AccentRule />
        <Paragraph muted>恋愛指南じゃなく、関係性の取扱説明書として。</Paragraph>

        <ChapterFooter chapterLabel="第5章 / Love" />
      </Page>
    </>
  );
}
