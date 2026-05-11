// 1章：あなたという宇宙の設計図（4p）
// 視認性強化：命術16をルーツ別5グループのカード化／チップ／コールアウトで階層を明確化

import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
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

const FALLBACK_LEAD = `数千年前から人類は、生まれた瞬間の天体や暦から、人の傾向を読もうとしてきた。四柱推命、西洋占星術、数秘、マヤ暦、紫微斗数——それぞれは別々の文化で生まれたのに、不思議と同じ人について似たことを言う。
この章では、16の命術があなたという一人の人間について何を語っているか、矛盾と一致を含めて全部並べる。占いとして読まないでほしい。「数千年分の人類の観察データが、あなたという個体を見たときに何を浮かび上がらせるか」。それを淡々と読むだけでいい。`;

const FALLBACK_ALIGNMENTS = [
  '内省と発信のバランスを取る傾向（複数の命術が同方向を指す）',
  '中長期で価値を積み上げる気質',
  '人との距離設計に独自のリズムを持つ',
];
const FALLBACK_CONFLICTS = [
  '集団リーダー型と単独行動型の指標が同居（場面で切り替える設計）',
  '安定志向と変化志向のスコアが拮抗（時期による振れ幅が想定される）',
];
const FALLBACK_CORE = `16の命術を横断して読むと、あなたの設計の核は「自分の感覚を確かめながら、外と接続する点を選ぶ」気質に集約される。情報を浴びるよりも、選んだ少数を深く扱うことで本領が出る。短期の派手さよりも、中期で複利が効く構造に向いている。`;
const FALLBACK_TAGS = [
  '内省', '構造化', '少数精鋭', '中期視点', '言語化',
  '美意識', '自律', '観察眼', '再現性', '深掘り',
];

// 命術の5グループ定義
type GroupKey = 'wuxing' | 'star' | 'number' | 'calendar' | 'modern';
const GROUP_META: Record<GroupKey, { label: string; jp: string; color: string; bg: string }> = {
  wuxing:   { label: 'WUXING',   jp: '陰陽五行系',   color: colors.catBlue,  bg: colors.catBlueBg  },
  star:     { label: 'STAR',     jp: '星位系',       color: colors.catSlate, bg: colors.catSlateBg },
  number:   { label: 'NUMBER',   jp: '数系',         color: colors.catSand,  bg: colors.catSandBg  },
  calendar: { label: 'CALENDAR', jp: '暦系',         color: colors.primary,  bg: colors.calloutCoreBg },
  modern:   { label: 'MODERN',   jp: '独自構築系',   color: colors.catCoral, bg: colors.catCoralBg },
};

export function Chapter1Universe({ celestial, llmContent }: ReportProps) {
  const lead = llmContent.chapter1?.leadText ?? FALLBACK_LEAD;
  const alignments = llmContent.chapter1?.threeAlignments ?? FALLBACK_ALIGNMENTS;
  const conflicts = llmContent.chapter1?.twoConflicts ?? FALLBACK_CONFLICTS;
  const core = llmContent.chapter1?.coreSummary ?? FALLBACK_CORE;
  const tags = llmContent.chapter1?.integrationTags ?? FALLBACK_TAGS;

  // グループ別の命術行を組み立て
  type Row = { label: string; value: string };
  const groups: Record<GroupKey, Row[]> = {
    wuxing: [],
    star: [],
    number: [],
    calendar: [],
    modern: [],
  };

  if (!('error' in celestial.shichu)) {
    groups.wuxing.push({ label: '四柱推命', value: `${celestial.shichu.dayPillar}／五行：${celestial.shichu.wuXing.day}` });
  }
  if (!('error' in celestial.sanmei)) {
    groups.wuxing.push({ label: '算命学', value: `主星：${celestial.sanmei.mainStar}` });
  }
  if (!('error' in celestial.seiyou)) {
    groups.star.push({ label: '西洋占星', value: `太陽${celestial.seiyou.sun.sign}／月${celestial.seiyou.moon.sign}` });
  }
  if (!('error' in celestial.ziwei)) {
    groups.star.push({ label: '紫微斗数', value: `命宮：${celestial.ziwei.soul}／身宮：${celestial.ziwei.body}` });
  }
  if (!('error' in celestial.numerology)) {
    groups.number.push({ label: '数秘術', value: `LP ${celestial.numerology.lifePath}／運命数 ${celestial.numerology.destiny}` });
  }
  if (!('error' in celestial.maya)) {
    groups.number.push({ label: 'マヤ暦', value: `KIN ${celestial.maya.kin}「${celestial.maya.glyph}」音 ${celestial.maya.galacticTone}` });
  }
  if (!('error' in celestial.kyusei)) {
    groups.calendar.push({ label: '九星気学', value: `本命星：${celestial.kyusei.honmeiSei.name}（${celestial.kyusei.honmeiSei.element}）` });
  }
  if (!('error' in celestial.shukuyou)) {
    groups.calendar.push({ label: '宿曜', value: `${celestial.shukuyou.xiu27}／${celestial.shukuyou.group}` });
  }
  if (!('error' in celestial.days366)) {
    groups.calendar.push({ label: '366日タイプ', value: `${celestial.days366.typeName}（${celestial.days366.keyword}）` });
  }
  if (!('error' in celestial.humandesign)) {
    groups.modern.push({ label: 'HD風', value: `${celestial.humandesign.type}／プロファイル ${celestial.humandesign.profile}` });
  }
  if (!('error' in celestial.doubutsu)) {
    groups.modern.push({ label: '動物キャラ', value: celestial.doubutsu.fullName });
  }
  if (!('error' in celestial.shunkashutou)) {
    groups.modern.push({ label: '春夏秋冬', value: `${celestial.shunkashutou.season}・${celestial.shunkashutou.phase}` });
  }
  if (!('error' in celestial.teiou)) {
    groups.modern.push({ label: '帝王学', value: celestial.teiou.classType });
  }
  if (!('error' in celestial.shihaisei)) {
    groups.modern.push({ label: '12支配星', value: `${celestial.shihaisei.starName}（${celestial.shihaisei.archetype}）` });
  }
  if (!('error' in celestial.seimei)) {
    groups.modern.push({ label: '姓名判断', value: `天${celestial.seimei.gokaku.tenkaku}／人${celestial.seimei.gokaku.jinkaku}／三才：${celestial.seimei.sansaiHaichi.harmony}` });
  }
  if (!('error' in celestial.biorhythm)) {
    groups.modern.push({ label: 'バイオリズム', value: '12ヶ月分の波形を10章で展開' });
  }

  return (
    <>
      <Page size="A4" style={styles.page}>
        <ChapterHeader
          index="第1章 / CHAPTER 01"
          title="あなたという宇宙の設計図"
          subtitle="16の古典叡智が語る、あなたの根"
        />

        <Quote>{lead}</Quote>

        <SectionTitle>命術16の総覧（5グループ）</SectionTitle>

        {(['wuxing', 'star', 'number', 'calendar', 'modern'] as GroupKey[]).map((g) => {
          const meta = GROUP_META[g];
          const rows = groups[g];
          if (rows.length === 0) return null;
          return (
            <View
              key={g}
              style={{
                backgroundColor: meta.bg,
                borderLeftWidth: 3,
                borderLeftColor: meta.color,
                paddingTop: 8,
                paddingBottom: 8,
                paddingLeft: 12,
                paddingRight: 12,
                marginBottom: 8,
                borderRadius: 3,
              }}
              wrap={false}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    color: meta.color,
                    letterSpacing: 2,
                    marginRight: 8,
                  }}
                >
                  {meta.label}
                </Text>
                <Text style={{ fontSize: 9.5, fontWeight: 700, color: colors.primary }}>
                  {meta.jp}
                </Text>
              </View>
              {rows.map((r, ri) => (
                <View key={ri} style={{ flexDirection: 'row', marginBottom: 2 }}>
                  <Text
                    style={{
                      width: 80,
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: colors.primaryLight,
                    }}
                  >
                    {r.label}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 9.5, color: colors.text, lineHeight: 1.45 }}>
                    {r.value}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

        <ChapterFooter chapterLabel="第1章 / Universe" />
      </Page>

      <Page size="A4" style={styles.page}>
        <SectionTitle>5つの大きな潮流</SectionTitle>
        <Paragraph>
          16の命術は、ルーツでざっくり5グループに分けて読める。陰陽五行系（四柱推命・算命学）／星位系（西洋占星・紫微斗数）／数系（数秘・マヤ）／暦系（九星・宿曜・366日）／独自構築系（HD風・動物キャラ・春夏秋冬・帝王学・12支配星・バイオリズム）。同じ人物について、5つの違う言語が同じことを言っている部分が、最も信頼できる手がかり。
        </Paragraph>

        {/* 一致点コールアウト */}
        <View
          style={{
            backgroundColor: colors.calloutInfoBg,
            borderLeftWidth: 4,
            borderLeftColor: colors.calloutInfo,
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 14,
            paddingRight: 14,
            marginTop: 10,
            marginBottom: 8,
            borderRadius: 3,
          }}
        >
          <Text
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              color: colors.calloutInfo,
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            ALIGNMENT — 3つの一致点
          </Text>
          <Text style={{ fontSize: 9.5, color: colors.textSubtle, marginBottom: 4 }}>
            複数の命術が共通して指している性質トップ3：
          </Text>
          {alignments.map((a, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 2 }}>
              <Text style={{ width: 14, color: colors.calloutInfo, fontSize: 10.5, fontWeight: 700 }}>
                {i + 1}.
              </Text>
              <Text style={{ flex: 1, fontSize: 10.5, color: colors.text, lineHeight: 1.6 }}>{a}</Text>
            </View>
          ))}
        </View>

        {/* 矛盾点コールアウト */}
        <View
          style={{
            backgroundColor: colors.calloutWarnBg,
            borderLeftWidth: 4,
            borderLeftColor: colors.calloutWarn,
            paddingTop: 10,
            paddingBottom: 10,
            paddingLeft: 14,
            paddingRight: 14,
            marginBottom: 12,
            borderRadius: 3,
          }}
        >
          <Text
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              color: colors.calloutWarn,
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            CONFLICT — 2つの矛盾点
          </Text>
          <Text style={{ fontSize: 9.5, color: colors.textSubtle, marginBottom: 4 }}>
            命術同士が違うことを言っている部分。これが個性の輪郭を作る：
          </Text>
          {conflicts.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 2 }}>
              <Text style={{ width: 14, color: colors.calloutWarn, fontSize: 10.5, fontWeight: 700 }}>
                {i + 1}.
              </Text>
              <Text style={{ flex: 1, fontSize: 10.5, color: colors.text, lineHeight: 1.6 }}>{c}</Text>
            </View>
          ))}
        </View>

        <ChapterFooter chapterLabel="第1章 / Universe" />
      </Page>

      <Page size="A4" style={styles.page}>
        <SectionTitle>この設計が示す「核」</SectionTitle>
        <View
          style={{
            backgroundColor: colors.calloutCoreBg,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary,
            paddingTop: 12,
            paddingBottom: 12,
            paddingLeft: 16,
            paddingRight: 16,
            marginBottom: 14,
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
            CORE — あなたという核
          </Text>
          <Text style={{ fontSize: 11, color: colors.text, lineHeight: 1.7 }}>{core}</Text>
        </View>

        <SectionTitle>統合タグ（あなたを形容する10語）</SectionTitle>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
          {tags.map((t, i) => (
            <View
              key={i}
              style={{
                backgroundColor: colors.backgroundCard,
                borderColor: colors.accent,
                borderWidth: 0.5,
                borderRadius: 12,
                paddingTop: 4,
                paddingBottom: 4,
                paddingLeft: 10,
                paddingRight: 10,
                marginRight: 6,
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 9, color: colors.primary, fontWeight: 700 }}>{t}</Text>
            </View>
          ))}
        </View>

        <AccentRule />
        <Paragraph muted>
          この10語は、命術16・心理スコア・あなたの言葉から抽出される、あなたの輪郭そのもの。これ以降の章で何度も顔を出す。
        </Paragraph>

        <ChapterFooter chapterLabel="第1章 / Universe" />
      </Page>
    </>
  );
}
