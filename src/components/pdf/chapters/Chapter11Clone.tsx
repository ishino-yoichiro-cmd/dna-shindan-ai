// 11章：あなたの分身AI（1.5p）
// データソース：全章統合タグ + 文体サンプル + NG表現 + 個別ボットURL

import React from 'react';
import { Page, Text, View, Image } from '@react-pdf/renderer';
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

const FALLBACK_LEAD = `このレポートを最後まで読んだあなたは、すでに「自分という人間の説明書」を手に入れている。でも、説明書を毎回読み返すのは現実的じゃない。
だから、ここまでの全ての情報——命術16・心理スコア・あなたが書いた言葉・文体・NG表現——を統合して、あなた自身として応答するAI分身を作った。下のURLを開けば、あなたの分身が、あなたの代わりに考えはじめる。`;

const FALLBACK_TRANSPLANT = [
  '命術16の結果（あなたの根の設計）',
  '心理スコア（行動パターンと判断基準）',
  '自由記述7問の回答（あなたの輪郭）',
  '文体サンプル300字（言葉の温度）',
  'NG表現（避ける言葉）',
];

const FALLBACK_CAP = [
  '壁打ち：判断に迷ったときに、あなた自身の価値観で考え直す',
  '人生相談：自分の落とし穴と強みを把握した相手として応答する',
  '文章チェック：あなたの文体に合っているかを確認する',
  '自分との対話：未来のあなた／過去のあなたとして話す',
];

const FALLBACK_USECASES = [
  '迷ったとき：「Aの選択肢で気が乗らない理由を、自分の価値観に照らして整理して」',
  '怒ったとき：「今この怒りは、自分のどの北極星が脅かされたから出てるか」',
  '大事な決断のとき：「3年後の自分から見たら、今のこの選択はどう映る？」',
];

const FALLBACK_PROMPTS = [
  '今日あった出来事の中で、自分の核に響いた瞬間を1つ拾って言語化して',
  '今週のスケジュールを見て、消耗する予定が混ざってないか見て',
  '私の長所が裏目に出てる兆候、最近ある？',
  '次の3ヶ月で最優先すべきことを、私の価値観で並べ直して',
  '私が今、目を逸らしてることを言語化して',
];

export function Chapter11Clone({ llmContent }: ReportProps) {
  const lead = llmContent.chapter11?.leadText ?? FALLBACK_LEAD;
  const transplant = llmContent.chapter11?.transplantedItems ?? FALLBACK_TRANSPLANT;
  const cap = llmContent.chapter11?.capabilities ?? FALLBACK_CAP;
  const url = llmContent.chapter11?.cloneUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dna.kami-ai.jp'}/clone/sample`;
  const qr = llmContent.chapter11?.qrCodeDataUrl;
  const useCases = llmContent.chapter11?.sampleUseCases ?? FALLBACK_USECASES;
  const prompts = llmContent.chapter11?.starterPrompts ?? FALLBACK_PROMPTS;

  return (
    <Page size="A4" style={styles.page}>
      <ChapterHeader index="第11章 / CHAPTER 11" title="あなたの分身AI" subtitle="ここまでの全てを、AIに移植した。" />

      <Quote>{lead}</Quote>

      <SectionTitle>分身AIに移植したもの</SectionTitle>
      {transplant.map((t, i) => (
        <Bullet key={i}>{t}</Bullet>
      ))}

      <SectionTitle>分身AIができること</SectionTitle>
      {cap.map((c, i) => (
        <Bullet key={i}>{c}</Bullet>
      ))}

      <SectionTitle>あなた専用URL</SectionTitle>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.primary,
          padding: 14,
          borderRadius: 4,
          marginBottom: 12,
        }}
      >
        {qr && (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={qr} style={{ width: 60, height: 60, marginRight: 14, backgroundColor: colors.textInverse, padding: 2 }} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, color: colors.accentLight, marginBottom: 4 }}>YOUR CLONE URL</Text>
          <Text style={{ fontSize: 11, color: colors.textInverse, fontWeight: 700 }}>{url}</Text>
        </View>
      </View>

      <SectionTitle>使い方サンプル3つ</SectionTitle>
      {useCases.map((u, i) => (
        <Bullet key={i}>{u}</Bullet>
      ))}

      <SectionTitle>分身AIへの初回プロンプト例</SectionTitle>
      <Card>
        {prompts.map((p, i) => (
          <Text key={i} style={[styles.cardBody, { fontSize: 9.5, marginBottom: 3 }]}>
            {i + 1}. {p}
          </Text>
        ))}
      </Card>

      <AccentRule />
      <Paragraph muted>もう一人の自分に、いつでも会える。</Paragraph>

      <ChapterFooter chapterLabel="第11章 / Clone AI" />
    </Page>
  );
}
