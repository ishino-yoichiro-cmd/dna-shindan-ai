// 10章：運気カレンダー（2p）
// データソース：バイオリズム + 九星月命 + 四柱流年

import React from 'react';
import { Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import {
  ChapterHeader,
  Quote,
  Paragraph,
  SectionTitle,
  ChapterFooter,
  AccentRule,
} from '../common';
import type { ReportProps } from '../types';

const FALLBACK_LEAD = `運気は信じる信じないじゃなく、「自分の身体と心が、特定の月にどんな状態になりやすいか」のパターン認識。これを知ってると、無理する月と休む月、攻める月と引く月が自然に決まる。
この章は、四柱推命・九星気学・バイオリズム年間カレンダーを統合した、あなた専用の12ヶ月マップ。来月から1年、月ごとに「今月のテーマ」と「今月の罠」を置く。`;

export function Chapter10Calendar({ celestial, llmContent }: ReportProps) {
  const lead = llmContent.chapter10?.leadText ?? FALLBACK_LEAD;
  const overview =
    llmContent.chapter10?.overview ??
    '12ヶ月のうち、3つの山と2つの谷がある。山は攻め、谷は休む。中間は淡々と積む時期。';

  // バイオリズム取得
  const biorhythm = !('error' in celestial.biorhythm) ? celestial.biorhythm.months : [];
  const months12 =
    llmContent.chapter10?.months12 ??
    biorhythm.slice(0, 12).map((b) => ({
      month: b.yearMonth,
      theme: b.theme || `運気：${b.fortune}`,
      trap: b.fortune === '凶' ? '無理に攻めない' : '勢いに任せすぎない',
      action: b.fortune === '大吉' || b.fortune === '吉' ? '前進する局面' : '整える局面',
    }));

  const keyMonths =
    llmContent.chapter10?.keyMonths ??
    biorhythm.slice(0, 12).reduce<{ type: '攻め' | '休む' | '転換'; month: string; note: string }[]>(
      (acc, b) => {
        if (b.fortune === '大吉' && acc.find((a) => a.type === '攻め') === undefined) {
          acc.push({ type: '攻め', month: b.yearMonth, note: 'この月は意思決定を前倒しに' });
        }
        if (b.fortune === '凶' && acc.find((a) => a.type === '休む') === undefined) {
          acc.push({ type: '休む', month: b.yearMonth, note: '意図的に予定を減らす月' });
        }
        if (b.fortune === '中吉' && acc.find((a) => a.type === '転換') === undefined) {
          acc.push({ type: '転換', month: b.yearMonth, note: '方向を再定義する月' });
        }
        return acc;
      },
      [],
    );

  const yearAfter =
    llmContent.chapter10?.yearAfterLine ??
    '1年後、このカレンダーを通ったあなたは、自分の波の読み方を覚えている。';

  return (
    <>
      <Page size="A4" style={styles.page}>
        <ChapterHeader index="第10章 / CHAPTER 10" title="運気カレンダー" subtitle="12ヶ月先まで、あなたのバイオリズムを置く" />

        <Quote>{lead}</Quote>

        <SectionTitle>全体の流れ</SectionTitle>
        <Paragraph>{overview}</Paragraph>

        <SectionTitle>12ヶ月マップ</SectionTitle>
        <View style={styles.table}>
          <View style={[styles.tableRow, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.tableLabel, { width: '14%' }]}>月</Text>
            <Text style={[styles.tableLabel, { width: '32%' }]}>テーマ</Text>
            <Text style={[styles.tableLabel, { width: '28%' }]}>今月の罠</Text>
            <Text style={[styles.tableLabel, { width: '26%' }]}>推奨行動</Text>
          </View>
          {months12.map((m, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableValue, { width: '14%', fontSize: 8.5 }]}>{m.month}</Text>
              <Text style={[styles.tableValue, { width: '32%', fontSize: 8.5 }]}>{m.theme}</Text>
              <Text style={[styles.tableValue, { width: '28%', fontSize: 8.5 }]}>{m.trap}</Text>
              <Text style={[styles.tableValue, { width: '26%', fontSize: 8.5 }]}>{m.action}</Text>
            </View>
          ))}
        </View>

        <ChapterFooter chapterLabel="第10章 / Calendar" />
      </Page>

      <Page size="A4" style={styles.page}>
        <SectionTitle>特に大きい3つの月</SectionTitle>
        {keyMonths.map((k, i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.backgroundCard,
              padding: 10,
              marginBottom: 8,
              borderLeftWidth: 2,
              borderLeftColor: colors.accent,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: 700, color: colors.primary, marginBottom: 3 }}>
              {k.type}の月：{k.month}
            </Text>
            <Text style={{ fontSize: 10, color: colors.text, lineHeight: 1.7 }}>{k.note}</Text>
          </View>
        ))}

        <SectionTitle>1年後のあなたへ</SectionTitle>
        <Paragraph>{yearAfter}</Paragraph>

        <AccentRule />
        <Paragraph muted>運気は信じるものではなく、自分のリズムを読むためのツール。</Paragraph>

        <ChapterFooter chapterLabel="第10章 / Calendar" />
      </Page>
    </>
  );
}
