// 終章：総括 — これまでの全てと、これからの未来へ
// 旧仕様（手紙形式）を廃止し、全章統合の総括＋未来期待トーンに刷新。
// LLM 文字列が来ない場合のフォールバック表示。

import React from 'react';
import { Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from '../styles';
import {
  ChapterHeader,
  Quote,
  SectionTitle,
  ChapterFooter,
  AccentRule,
} from '../common';
import type { ReportProps } from '../types';

const COMMON_LEAD = `ここまで読んでくれてありがとう。
50ページ以上の設計図を、最後にひとつの言葉に束ねる。
ここから先、あなたが歩いていく時間に持っていけるものとして。`;

const COMMON_CLOSING = `このレポートは、いまこの瞬間のあなたの設計図。
1年後、3年後にもう一度開くと、違うところが響く。
あなたの進化を、この50ページ以上は静かに祝福している。`;

const FALLBACK_CORES = [
  {
    title: '感覚で確かめてから、外と接続する',
    body: '命術と心理が共通して指していたのは、情報を浴びるよりも、選んだ少数を深く扱う気質。短期の派手さよりも、中期で複利が効く構造に向いている。',
  },
  {
    title: '構造を見抜いて、そこに自分を置く',
    body: '才能の指紋・ビジネスでの輝き方・落とし穴の章で繰り返し現れたのは、目の前の現象の裏側を構造として理解する力。代えがきかない場所は、いつもそこから生まれる。',
  },
  {
    title: '言葉で核を残し、時間と一緒に磨く',
    body: '価値観のコンパスとグランドデザインから浮かぶのは、自分の言葉でしか自分を運べないという軸。書く・話す・残すは、あなたが自分自身を更新するための主回路。',
  },
];

const FALLBACK_FUTURE = [
  '核は完成形ではなく、これから磨かれていく軸。同じ言葉が、1年後には違う深さで効いてくる',
  '今後出会う問いや転機は、あなたの設計を試すというより「あなたの設計が選んだ」もの',
  '誰かと比較する必要のない人生軌道を、すでにあなたは歩きはじめている',
  'このレポートの言葉は、未来のどこかで「あの時こう書かれていた意味」として立ち上がる',
];

export function ChapterEnd({ userInfo }: ReportProps) {
  return (
    <Page size="A4" style={styles.page}>
      <ChapterHeader
        index="終章 / EPILOGUE"
        title="総括 — これまでと、これからのあなたへ"
        subtitle={`To ${userInfo.fullName}`}
      />

      <Quote>{COMMON_LEAD}</Quote>

      <SectionTitle>このレポートが描き出した「あなたという核」</SectionTitle>
      {FALLBACK_CORES.map((c, i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.backgroundCard,
            borderLeftWidth: 3,
            borderLeftColor: colors.accent,
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 14,
            paddingRight: 14,
            marginBottom: 8,
            borderRadius: 3,
          }}
          wrap={false}
        >
          <Text
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              color: colors.accent,
              letterSpacing: 2,
              marginBottom: 3,
            }}
          >
            CORE {i + 1}
          </Text>
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: colors.primary,
              marginBottom: 4,
              lineHeight: 1.35,
            }}
          >
            {c.title}
          </Text>
          <Text style={{ fontSize: 10.5, color: colors.text, lineHeight: 1.6 }}>{c.body}</Text>
        </View>
      ))}

      <SectionTitle>これからのあなたへの期待</SectionTitle>
      <View
        style={{
          backgroundColor: colors.calloutCoreBg,
          borderLeftWidth: 4,
          borderLeftColor: colors.primary,
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 16,
          paddingRight: 16,
          marginBottom: 12,
          borderRadius: 3,
        }}
      >
        <Text
          style={{
            fontSize: 8.5,
            fontWeight: 700,
            color: colors.primary,
            letterSpacing: 2,
            marginBottom: 6,
          }}
        >
          FUTURE
        </Text>
        {FALLBACK_FUTURE.map((f, i) => (
          <View key={i} style={{ flexDirection: 'row', marginBottom: 4 }}>
            <Text style={{ width: 14, color: colors.accent, fontSize: 10.5, fontWeight: 700 }}>▸</Text>
            <Text style={{ flex: 1, fontSize: 10.5, color: colors.text, lineHeight: 1.6 }}>{f}</Text>
          </View>
        ))}
      </View>

      <AccentRule />

      <View
        style={{
          marginTop: 4,
          marginBottom: 12,
          paddingTop: 12,
          paddingBottom: 12,
          borderTopWidth: 0.5,
          borderTopColor: colors.divider,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.divider,
        }}
      >
        <Text style={{ fontSize: 10.5, color: colors.quote, lineHeight: 1.85 }}>{COMMON_CLOSING}</Text>
      </View>

      <Text
        style={{
          fontSize: 8,
          color: colors.textMuted,
          textAlign: 'center',
          marginTop: 18,
          letterSpacing: 3,
        }}
      >
        DNA SHINDAN AI / FIN.
      </Text>

      <ChapterFooter chapterLabel="終章 / Epilogue" />
    </Page>
  );
}
