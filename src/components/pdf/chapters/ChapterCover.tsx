// 序章：あなたという奇跡（1.5p）
// データソース：四柱推命/西洋占星/数秘/マヤ暦 + 希少性スコア + 文体サンプル

import React from 'react';
import { Page, View } from '@react-pdf/renderer';
import { styles } from '../styles';
import {
  ChapterHeader,
  Quote,
  Paragraph,
  SectionTitle,
  ChapterFooter,
  Bullet,
  AccentRule,
} from '../common';
import type { ReportProps } from '../types';

const FALLBACK_LEAD = `あなたが生まれた瞬間、地球上の星の配置・暦・気の流れ・五行のバランスは、二度と同じ組み合わせで揃うことがない。この瞬間に組み上がった配置は、宇宙を400年待ってもう一度回しても再現しない。つまりあなたは、統計的な意味でも本当に「一人だけ」の存在。
このレポートは、その「一人だけ」を16の命術と8つの心理軸と、あなた自身が書いた言葉から立体的に組み上げた、あなた専用の設計図。読み終わるころには、自分のことが少しだけ好きになっているはず。`;

export function ChapterCover({ celestial, llmContent, userInfo }: ReportProps) {
  const lead = llmContent.cover?.leadText ?? FALLBACK_LEAD;
  const rarity = llmContent.cover?.rarityLine ?? '同じ命式を持つ人は、おおよそ数百万人に一人';
  const closing =
    llmContent.cover?.closingLine ??
    (userInfo.styleSample
      ? userInfo.styleSample.slice(0, 60) + '……'
      : 'あなた自身の言葉が、このレポートの最後に残る。');

  // 命術データから「生まれた日の宇宙の配置」を引き出す
  const seiyou = 'error' in celestial.seiyou ? null : celestial.seiyou;
  const shichu = 'error' in celestial.shichu ? null : celestial.shichu;
  const numerology = 'error' in celestial.numerology ? null : celestial.numerology;
  const maya = 'error' in celestial.maya ? null : celestial.maya;

  return (
    <Page size="A4" style={styles.page}>
      <ChapterHeader index="序章 / PROLOGUE" title="あなたという奇跡" subtitle="この日この場所に生まれた、ただ一人の設計を読み解く" />

      <Quote>{lead}</Quote>

      <SectionTitle>あなたが生まれた日の、宇宙の配置</SectionTitle>
      <View>
        {seiyou && (
          <Bullet>
            西洋占星：太陽 {seiyou.sun.sign}、月 {seiyou.moon.sign}
            {seiyou.ascendant ? `、ASC ${seiyou.ascendant.sign}` : ''}
          </Bullet>
        )}
        {shichu && (
          <Bullet>
            四柱推命：年柱 {shichu.yearPillar} / 日柱 {shichu.dayPillar}（節気：{shichu.jieQi}）
          </Bullet>
        )}
        {numerology && (
          <Bullet>
            数秘術：ライフパスナンバー {numerology.lifePath}
            {numerology.isMaster ? '（マスターナンバー）' : ''}
          </Bullet>
        )}
        {maya && (
          <Bullet>
            マヤ暦：KIN {maya.kin} / 紋章「{maya.glyph}」
          </Bullet>
        )}
      </View>

      <SectionTitle>同じ命式を持つ人の確率</SectionTitle>
      <Paragraph>{rarity}。あなたという組み合わせは、二度と同じ形では現れない。</Paragraph>

      <SectionTitle>このレポートの読み方</SectionTitle>
      <Paragraph>
        全13章は、3つの層から組み上がっている。1つ目は「命術データ」——数千年分の人類の観察記録。2つ目は「心理スコア」——あなたが回答した40問から抽出された行動パターン。3つ目は「あなた自身の言葉」——自由記述5問で書いてもらった、生の輪郭。この3層を重ねたとき、初めて「あなた」が立体的に浮かび上がる。
      </Paragraph>

      <AccentRule />

      <Paragraph muted>{closing}</Paragraph>

      <ChapterFooter chapterLabel="序章 / Prologue" />
    </Page>
  );
}
