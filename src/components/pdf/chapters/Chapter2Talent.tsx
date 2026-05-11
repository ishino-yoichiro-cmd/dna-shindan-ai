// 2章：才能の指紋（2.5p）
// データソース：四柱/西洋/紫微 + Big5上位2 + RIASEC上位2 + Q35

import React from 'react';
import { Page, Text } from '@react-pdf/renderer';
import { styles } from '../styles';
import {
  ChapterHeader,
  Quote,
  Paragraph,
  SectionTitle,
  ChapterFooter,
  DataTable,
  Card,
  AccentRule,
} from '../common';
import type { ReportProps } from '../types';

const FALLBACK_LEAD = `才能の見つけ方を間違えている人がほとんど。「努力して身につけたスキル」を才能と呼んでしまう。違う。才能とは、息するように出来てしまって、本人だけが「これは才能じゃない」と思っているもの。
この章では、命術が示す素質と、心理スコアが示す行動パターンと、あなた自身が「人から褒められた経験」として書いた言葉を重ねて、あなたの「無自覚な強み」を3つに絞って言語化する。`;

const FALLBACK_FINGERS = [
  { name: '構造を見抜く目', scene: '混沌とした情報を渡されたとき、勝手に整理が始まる。本人は「整理しただけ」と思っている。' },
  { name: '言葉のチューニング', scene: '同じ意味でも、その場の空気と相手の状態に合わせて言葉が自動で調整される。' },
  { name: '深く掘る集中', scene: '関心を持った対象に対して、時間感覚が消えるレベルで没入する。' },
];

const FALLBACK_MONETIZE = '今週中に、自分が当たり前にやっている作業を1つ言語化して、人に教えてみる。「これ才能だよ」と言われたら、それが市場接続の入口。';

export function Chapter2Talent({ celestial, scores, llmContent }: ReportProps) {
  const lead = llmContent.chapter2?.leadText ?? FALLBACK_LEAD;
  const fingers = llmContent.chapter2?.threeFingers ?? FALLBACK_FINGERS;
  const monetize = llmContent.chapter2?.monetizeStep ?? FALLBACK_MONETIZE;

  const meishuRows: { label: string; value: string }[] = [];
  if (!('error' in celestial.shichu)) {
    meishuRows.push({ label: '四柱推命：日干', value: celestial.shichu.dayPillar });
  }
  if (!('error' in celestial.seiyou)) {
    meishuRows.push({ label: '西洋占星：太陽', value: `${celestial.seiyou.sun.sign}（${celestial.seiyou.sun.degree.toFixed(1)}度）` });
  }
  if (!('error' in celestial.ziwei)) {
    meishuRows.push({ label: '紫微斗数：命宮主星', value: celestial.ziwei.soul });
  }

  const psychoRows: { label: string; value: string }[] = [];
  if (scores.bigFive) {
    const sorted = Object.entries(scores.bigFive).sort((a, b) => b[1] - a[1]).slice(0, 2);
    psychoRows.push({ label: 'Big5 上位2', value: sorted.map(([k, v]) => `${k}:${v}`).join('  ') });
  }
  if (scores.riasec?.top3) {
    psychoRows.push({ label: 'RIASEC 上位2', value: scores.riasec.top3.slice(0, 2).join(' / ') });
  }
  if (scores.entrepreneur) {
    psychoRows.push({ label: '起業家タイプ', value: `${scores.entrepreneur.primary}（補助：${scores.entrepreneur.secondary}）` });
  }

  return (
    <>
      <Page size="A4" style={styles.page}>
        <ChapterHeader index="第2章 / CHAPTER 02" title="才能の指紋" subtitle="あなたが息するように出来てしまうこと" />

        <Quote>{lead}</Quote>

        <SectionTitle>命術が示す素質</SectionTitle>
        <DataTable rows={meishuRows.length ? meishuRows : [{ label: 'データ', value: '統合エンジンで生成' }]} />

        <SectionTitle>心理スコアが示す行動パターン</SectionTitle>
        <DataTable rows={psychoRows.length ? psychoRows : [{ label: '心理スコア', value: 'Phase 2-Bで計算' }]} />

        <ChapterFooter chapterLabel="第2章 / Talent" />
      </Page>

      <Page size="A4" style={styles.page}>
        <SectionTitle>3つの「指紋」</SectionTitle>
        <Paragraph muted>
          無自覚な才能トップ3を、命名と発動シーンの形で言語化する。
        </Paragraph>

        {fingers.map((f, i) => (
          <Card key={i} title={`指紋 ${i + 1}：${f.name}`}>
            <Text style={styles.cardBody}>{f.scene}</Text>
          </Card>
        ))}

        <SectionTitle>この才能をお金に変える初手</SectionTitle>
        <Paragraph>{monetize}</Paragraph>

        <AccentRule />
        <Paragraph muted>
          才能は「ある／ない」じゃなく「気づいてる／気づいていない」。気づいた瞬間から、市場との接続が始まる。
        </Paragraph>

        <ChapterFooter chapterLabel="第2章 / Talent" />
      </Page>
    </>
  );
}
