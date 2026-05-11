// 各章共通の構成要素
// ChapterHeader / Footer / SectionTitle / Quote / Bullet など

import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { styles, colors } from './styles';

// 章ヘッダー（番号 + タイトル + サブタイトル）
export function ChapterHeader({
  index,
  title,
  subtitle,
}: {
  index: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View>
      <View style={styles.chapterNumberBlock}>
        <Text style={styles.chapterNumber}>{index}</Text>
        <View style={styles.chapterRule} />
      </View>
      <Text style={styles.chapterTitle}>{title}</Text>
      {subtitle ? <Text style={styles.chapterSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// セクション見出し
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function SubTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h3}>{children}</Text>;
}

// 引用（リード文・本人の言葉）
export function Quote({ children }: { children: React.ReactNode }) {
  return <Text style={styles.quote}>{children}</Text>;
}

// 本文段落
export function Paragraph({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return <Text style={muted ? styles.bodyMuted : styles.body}>{children}</Text>;
}

// 箇条書き
export function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.listBullet}>・</Text>
      <Text style={styles.listText}>{children}</Text>
    </View>
  );
}

// 番号付きリスト
export function NumberedItem({
  n,
  children,
}: {
  n: number | string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.listItem}>
      <Text style={[styles.listBullet, { width: 18 }]}>{n}.</Text>
      <Text style={styles.listText}>{children}</Text>
    </View>
  );
}

// データテーブル
export function DataTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <View style={styles.table}>
      {rows.map((r, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={styles.tableLabel}>{r.label}</Text>
          <Text style={styles.tableValue}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

// 情報カード
export function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      <View>{children}</View>
    </View>
  );
}

// 区切り線（金）
export function AccentRule() {
  return <View style={styles.hrAccent} />;
}

// 章フッター（ページ番号 + ブランド名）
export function ChapterFooter({ chapterLabel }: { chapterLabel: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerLeft}>DNA SHINDAN AI</Text>
      <Text style={styles.footerRight}>{chapterLabel}</Text>
    </View>
  );
}

// インライン強調
export function Strong({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontWeight: 700, color: colors.primary }}>{children}</Text>;
}
