// 6章：ビジネスでの輝き方（3p）
// データソース：起業家8 + RIASEC + 紫微事業/財帛 + 四柱財星/官星 + Q30/Q19

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
  DataTable,
} from '../common';
import type { ReportProps } from '../types';

const FALLBACK_LEAD = `仕事で輝く人は、「努力した分野」じゃなく「素質と市場ニーズが交差した場所」で勝負している。素質は生まれつき。市場は変わる。だから、自分の素質が今どの市場と接続するかを言語化できれば、戦い方が決まる。
この章では、起業家8タイプ・RIASEC職業適性・命術の社会運から、あなたが商売として輝ける具体的な座標を取り出す。会社員でも独立でも、あなたの「ポジショニング」を決める材料になる。`;

const FALLBACK_INDUSTRIES = ['情報設計', '教育・伝達業', '企画・コンセプト構築'];

const FALLBACK_SCENARIOS = [
  {
    title: 'A：雇われで輝く',
    body: '体系をすでに持つ組織に入り、その内部で「仕組みを設計する側」に回る。0→1ではなく、1→10の局面で力が出る。',
  },
  {
    title: 'B：独立で輝く',
    body: '少人数（1〜3名）の小さな箱で、自分の判断速度で動く。在庫を持たず、知的資源を売る業態と相性が良い。',
  },
  {
    title: 'C：創造で輝く',
    body: 'プロダクト・コンテンツ・教育プログラム等の「形のある制作物」を残す方向。短期収益より中期の代表作。',
  },
];

export function Chapter6Business({ celestial, scores, llmContent }: ReportProps) {
  const lead = llmContent.chapter6?.leadText ?? FALLBACK_LEAD;
  const enType =
    llmContent.chapter6?.entrepreneurType ??
    (scores.entrepreneur ? `${scores.entrepreneur.primary}（補助：${scores.entrepreneur.secondary}）` : 'Phase 2-Bで分類');
  const riasecLine =
    llmContent.chapter6?.riasecLine ??
    (scores.riasec?.top3 ? `RIASEC上位3：${scores.riasec.top3.join(' / ')}` : '30問の回答からPhase 2-Bで算出');
  const industries = llmContent.chapter6?.industries ?? FALLBACK_INDUSTRIES;
  const scenarios = llmContent.chapter6?.threeScenarios ?? FALLBACK_SCENARIOS;
  const avoid =
    llmContent.chapter6?.avoidStructure ??
    '常時マルチタスク × 短サイクルKPI × 即レス文化の組み合わせ。素質が腐る構造。';
  const positioning =
    llmContent.chapter6?.positioning ?? '構造化×言語化×中期視点';

  const meishuRows: { label: string; value: string }[] = [];
  if (!('error' in celestial.ziwei)) {
    const career = celestial.ziwei.palaces.find((p) => p.name.includes('事業') || p.name.includes('官禄'));
    const wealth = celestial.ziwei.palaces.find((p) => p.name.includes('財帛'));
    if (career) {
      meishuRows.push({
        label: '紫微：事業宮',
        value: career.majorStars.map((s) => s.name).join(' / ') || '主星なし',
      });
    }
    if (wealth) {
      meishuRows.push({
        label: '紫微：財帛宮',
        value: wealth.majorStars.map((s) => s.name).join(' / ') || '主星なし',
      });
    }
  }
  if (!('error' in celestial.shichu)) {
    meishuRows.push({ label: '四柱：日柱の十神', value: celestial.shichu.shiShen.day });
  }

  return (
    <>
      <Page size="A4" style={styles.page}>
        <ChapterHeader index="第6章 / CHAPTER 06" title="ビジネスでの輝き方" subtitle="あなたが市場で『代えがきかない』と言われる場所" />

        <Quote>{lead}</Quote>

        <SectionTitle>あなたの起業家タイプ</SectionTitle>
        <Paragraph>{enType}</Paragraph>

        <SectionTitle>職業適性プロファイル</SectionTitle>
        <Paragraph>{riasecLine}</Paragraph>

        <SectionTitle>命術が示す「向いてる業界」</SectionTitle>
        {meishuRows.length > 0 && <DataTable rows={meishuRows} />}
        {industries.map((i, idx) => (
          <Bullet key={idx}>{i}</Bullet>
        ))}

        <ChapterFooter chapterLabel="第6章 / Business" />
      </Page>

      <Page size="A4" style={styles.page}>
        <SectionTitle>3つの稼ぎ方シナリオ</SectionTitle>
        {scenarios.map((s, i) => (
          <Card key={i} title={s.title}>
            <Text style={styles.cardBody}>{s.body}</Text>
          </Card>
        ))}

        <ChapterFooter chapterLabel="第6章 / Business" />
      </Page>

      <Page size="A4" style={styles.page}>
        <SectionTitle>避けたほうがいい仕事の構造</SectionTitle>
        <Card>
          <Text style={styles.cardBody}>{avoid}</Text>
        </Card>

        <SectionTitle>あなただけのポジショニング1行</SectionTitle>
        <Card>
          <Text style={[styles.cardBody, { fontWeight: 700, fontSize: 13 }]}>{positioning}</Text>
        </Card>

        <AccentRule />
        <Paragraph muted>素質は生まれつき、市場は変わる。両者の交差点を毎年更新する。</Paragraph>

        <ChapterFooter chapterLabel="第6章 / Business" />
      </Page>
    </>
  );
}
