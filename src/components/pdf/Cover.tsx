// 表紙ページ＋目次ページ
// artist観点：紺背景＋金アクセント、視認性強化のためカテゴリ色分け＋章サブ見出し追加

import React from 'react';
import { Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from './styles';
import type { ReportProps } from './types';

export function CoverPage({ userInfo }: ReportProps) {
  const issuedAt = new Date().toISOString().slice(0, 10);

  return (
    <Page size="A4" style={styles.coverPage}>
      {/* ヘッダー */}
      <Text style={{ fontSize: 11, color: colors.accent, letterSpacing: 6, marginBottom: 6 }}>
        DNA SHINDAN AI
      </Text>
      <Text style={{ fontSize: 9, color: colors.accentLight, letterSpacing: 3, marginBottom: 50 }}>
        個人設計図レポート / Personal Blueprint
      </Text>

      <View style={styles.coverDivider} />

      {/* タイトル */}
      <Text style={styles.coverTitle}>あなたという奇跡</Text>
      <Text style={styles.coverSubtitle}>16の命術 × 8つの心理軸 × あなた自身の言葉</Text>

      {/* スケール感（数字バッジ） */}
      <View
        style={{
          flexDirection: 'row',
          marginTop: 24,
          marginBottom: 40,
        }}
      >
        {[
          { num: '16', label: '命術' },
          { num: '8', label: '心理軸' },
          { num: '40', label: '質問' },
          { num: '13', label: '章' },
        ].map((s, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              alignItems: 'center',
              borderRightWidth: i === 3 ? 0 : 0.5,
              borderRightColor: colors.accent,
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: 700, color: colors.accent, marginBottom: 2 }}>
              {s.num}
            </Text>
            <Text
              style={{
                fontSize: 8,
                color: colors.accentLight,
                letterSpacing: 2,
              }}
            >
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* 名前ブロック */}
      <View style={{ marginTop: 30 }}>
        <Text style={{ fontSize: 8, color: colors.accent, letterSpacing: 3, marginBottom: 6 }}>
          ISSUED FOR
        </Text>
        <Text style={styles.coverName}>{userInfo.fullName}</Text>
        <Text style={styles.coverMeta}>
          {userInfo.birthDate}
          {userInfo.birthTime ? ` ${userInfo.birthTime}` : ''}
        </Text>
        {userInfo.birthPlace && <Text style={styles.coverMeta}>{userInfo.birthPlace}</Text>}
      </View>

      {/* フッター */}
      <View style={styles.coverFooter}>
        <Text>Issued: {issuedAt}</Text>
        <Text style={{ marginTop: 4, fontSize: 8 }}>
          このレポートは、あなた専用に組み上げた個別設計図。
        </Text>
      </View>
    </Page>
  );
}

// =============================================================================
// 目次ページ — 章をカテゴリ別に色分けし、サブテーマも表示
// =============================================================================

type TocItem = {
  idx: string;
  title: string;
  sub: string;
  cat: 'prologue' | 'self' | 'action' | 'future' | 'epilogue';
};

const TOC: TocItem[] = [
  { idx: '序章', title: 'あなたという奇跡', sub: 'この日この場所に生まれた、ただ一人の設計', cat: 'prologue' },
  { idx: '第1章', title: 'あなたという宇宙の設計図', sub: '16の古典叡智が語る、あなたの根', cat: 'self' },
  { idx: '第2章', title: '才能の指紋', sub: 'あなたが息するように出来てしまうこと', cat: 'self' },
  { idx: '第3章', title: '情熱の発火点', sub: 'あなたが我を忘れる、その瞬間の構造', cat: 'self' },
  { idx: '第4章', title: '価値観のコンパス', sub: '怒りと違和感が指し示す、あなたの北極星', cat: 'self' },
  { idx: '第5章', title: '愛し方・愛され方', sub: 'あなたが安心するときの、関係性の形', cat: 'self' },
  { idx: '第6章', title: 'ビジネスでの輝き方', sub: '市場で「代えがきかない」と言われる場所', cat: 'action' },
  { idx: '第7章', title: '人生のグランドデザイン', sub: 'あなたのIKIGAIと、5年先の地図', cat: 'action' },
  { idx: '第8章', title: '成長の道標', sub: '3ヶ月・1年・3年でやること、たった9個', cat: 'action' },
  { idx: '第9章', title: 'あなたの落とし穴', sub: '同じ強みが、同じ場所であなたを倒す', cat: 'action' },
  { idx: '第10章', title: '運気カレンダー', sub: '12ヶ月先まで、あなたのバイオリズムを置く', cat: 'future' },
  { idx: '第11章', title: 'あなたの分身AI', sub: 'ここまでの全てを、AIに移植した', cat: 'future' },
  { idx: '終章', title: '総括 — これまでと、これからのあなたへ', sub: '全章を束ねる核と、未来への期待', cat: 'epilogue' },
];

const CAT_META: Record<TocItem['cat'], { label: string; color: string; bg: string }> = {
  prologue: { label: 'PROLOGUE', color: colors.accent, bg: colors.accentLight },
  self: { label: 'SELF', color: colors.catBlue, bg: colors.catBlueBg },
  action: { label: 'ACTION', color: colors.catSlate, bg: colors.catSlateBg },
  future: { label: 'FUTURE', color: colors.catCoral, bg: colors.catCoralBg },
  epilogue: { label: 'EPILOGUE', color: colors.accent, bg: colors.accentLight },
};

const CAT_GROUPS: { label: string; description: string; cat: TocItem['cat'] }[] = [
  { label: 'PROLOGUE', description: 'あなたが生まれた瞬間の話から始める', cat: 'prologue' },
  { label: 'SELF', description: '命術と心理から立ち上がる、あなたの核', cat: 'self' },
  { label: 'ACTION', description: '核を、現実の動きに変える設計', cat: 'action' },
  { label: 'FUTURE', description: '12ヶ月先と、あなたの分身AI', cat: 'future' },
  { label: 'EPILOGUE', description: '全章を束ねる総括と未来への期待', cat: 'epilogue' },
];

export function TocPage() {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={{ fontSize: 9, color: colors.accent, letterSpacing: 4, marginBottom: 4 }}>
        TABLE OF CONTENTS
      </Text>
      <Text style={{ fontSize: 22, fontWeight: 700, color: colors.primary, marginBottom: 6 }}>
        目次
      </Text>
      <View style={{ width: 40, height: 1, backgroundColor: colors.accent, marginBottom: 18 }} />

      {/* カテゴリ案内バー */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        {CAT_GROUPS.map((g, i) => {
          const meta = CAT_META[g.cat];
          return (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginRight: 14,
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: meta.color,
                  marginRight: 4,
                }}
              />
              <Text style={{ fontSize: 7.5, color: colors.textSubtle, letterSpacing: 1.2 }}>
                {g.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 目次本体 */}
      {TOC.map((t, i) => {
        const meta = CAT_META[t.cat];
        return (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingTop: 6,
              paddingBottom: 6,
              borderBottomWidth: 0.3,
              borderBottomColor: colors.divider,
            }}
            wrap={false}
          >
            {/* カテゴリ色バー */}
            <View
              style={{
                width: 3,
                height: 24,
                backgroundColor: meta.color,
                marginRight: 10,
              }}
            />
            {/* 章番号 */}
            <Text
              style={{
                fontSize: 9,
                color: colors.accent,
                fontWeight: 700,
                width: 52,
                letterSpacing: 1,
              }}
            >
              {t.idx}
            </Text>
            {/* タイトル＋サブ */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10.5, color: colors.primary, fontWeight: 700, lineHeight: 1.3 }}>
                {t.title}
              </Text>
              <Text
                style={{
                  fontSize: 8,
                  color: colors.textMuted,
                  lineHeight: 1.35,
                  marginTop: 1,
                }}
              >
                {t.sub}
              </Text>
            </View>
          </View>
        );
      })}

      {/* 読み方ガイド */}
      <View
        style={{
          marginTop: 24,
          backgroundColor: colors.backgroundCard,
          borderLeftWidth: 3,
          borderLeftColor: colors.accent,
          padding: 12,
          borderRadius: 3,
        }}
      >
        <Text
          style={{
            fontSize: 8.5,
            fontWeight: 700,
            color: colors.accent,
            letterSpacing: 2,
            marginBottom: 4,
          }}
        >
          HOW TO READ
        </Text>
        <Text style={{ fontSize: 9.5, color: colors.text, lineHeight: 1.65 }}>
          このレポートはAIエージェントに読み込ませて分身AIを構築することを目的に作られてる。直接読む場合も、順番通りに読む必要はない。いま気になる章から開いてほしい。時間を置いて読み直すと響く章も変わっているはずだ。
        </Text>
      </View>

      <View style={styles.footer} fixed>
        <Text style={styles.footerLeft}>DNA SHINDAN AI</Text>
        <Text style={styles.footerRight}>目次 / TOC</Text>
      </View>
    </Page>
  );
}
