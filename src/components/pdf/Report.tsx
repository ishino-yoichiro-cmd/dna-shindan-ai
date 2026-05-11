// PDFレポート全13章＋表紙＋目次の統合ドキュメント
// LLM生成テキスト（Markdown文字列）が llmContent に入っていれば MarkdownChapter で展開、
// なければ既存の構造化テンプレで表示。

import React from 'react';
import { Document } from '@react-pdf/renderer';
import { registerFonts } from './styles';
import { CoverPage, TocPage } from './Cover';
import { ChapterCover } from './chapters/ChapterCover';
import { Chapter1Universe } from './chapters/Chapter1Universe';
import { Chapter2Talent } from './chapters/Chapter2Talent';
import { Chapter3Passion } from './chapters/Chapter3Passion';
import { Chapter4Compass } from './chapters/Chapter4Compass';
import { Chapter5Love } from './chapters/Chapter5Love';
import { Chapter6Business } from './chapters/Chapter6Business';
import { Chapter7Design } from './chapters/Chapter7Design';
import { Chapter8Roadmap } from './chapters/Chapter8Roadmap';
import { Chapter9Pitfall } from './chapters/Chapter9Pitfall';
import { Chapter10Calendar } from './chapters/Chapter10Calendar';
import { Chapter11Clone } from './chapters/Chapter11Clone';
import { ChapterEnd } from './chapters/ChapterEnd';
import { AiMetaPage } from './AiMetaPage';
import { MarkdownChapter } from './MarkdownChapter';
import type { ReportProps } from './types';

const CHAPTER_META: Array<{
  key: string;
  index: string;
  title: string;
  subtitle?: string;
  fallbackComponent: React.ComponentType<ReportProps>;
}> = [
  { key: 'cover',    index: '序章 / PROLOGUE',     title: 'あなたという奇跡',     subtitle: 'この日この場所に生まれた、ただ一人の設計', fallbackComponent: ChapterCover },
  { key: 'chapter1', index: '第1章 / CHAPTER 01',  title: 'あなたという宇宙の設計図', subtitle: '16の古典叡智が語る、あなたの根',           fallbackComponent: Chapter1Universe },
  { key: 'chapter2', index: '第2章 / CHAPTER 02',  title: '才能の指紋',           subtitle: 'あなたが息するように出来てしまうこと',         fallbackComponent: Chapter2Talent },
  { key: 'chapter3', index: '第3章 / CHAPTER 03',  title: '情熱の発火点',         subtitle: 'あなたが我を忘れる、その瞬間の構造',           fallbackComponent: Chapter3Passion },
  { key: 'chapter4', index: '第4章 / CHAPTER 04',  title: '価値観のコンパス',     subtitle: '怒りと違和感が指し示す、あなたの北極星',       fallbackComponent: Chapter4Compass },
  { key: 'chapter5', index: '第5章 / CHAPTER 05',  title: '愛し方・愛され方',     subtitle: 'あなたが安心するときの、関係性の形',           fallbackComponent: Chapter5Love },
  { key: 'chapter6', index: '第6章 / CHAPTER 06',  title: 'ビジネスでの輝き方',   subtitle: 'あなたが市場で「代えがきかない」と言われる場所', fallbackComponent: Chapter6Business },
  { key: 'chapter7', index: '第7章 / CHAPTER 07',  title: '人生のグランドデザイン', subtitle: 'あなたのIKIGAIと、5年先の地図',             fallbackComponent: Chapter7Design },
  { key: 'chapter8', index: '第8章 / CHAPTER 08',  title: '成長の道標',           subtitle: '3ヶ月・1年・3年でやること、たった9個',         fallbackComponent: Chapter8Roadmap },
  { key: 'chapter9', index: '第9章 / CHAPTER 09',  title: 'あなたの落とし穴',     subtitle: '同じ強みが、同じ場所であなたを倒す',           fallbackComponent: Chapter9Pitfall },
  { key: 'chapter10',index: '第10章 / CHAPTER 10', title: '運気カレンダー',       subtitle: '12ヶ月先まで、あなたのバイオリズムを置く',     fallbackComponent: Chapter10Calendar },
  { key: 'chapter11',index: '第11章 / CHAPTER 11', title: 'あなたの分身AI',       subtitle: 'ここまでの全てを、AIに移植した。',           fallbackComponent: Chapter11Clone },
  { key: 'end',      index: '終章 / EPILOGUE',     title: '総括 — これまでと、これからのあなたへ',  subtitle: '全章を束ねる核と、これから歩む未来への期待',     fallbackComponent: ChapterEnd },
];

export function Report(props: ReportProps) {
  registerFonts();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const llm = (props.llmContent ?? {}) as Record<string, any>;

  const renderChapter = (m: typeof CHAPTER_META[number]) => {
    const v = llm[m.key];
    // LLMが文字列で返している場合（process-pendingの新設計）→ MarkdownChapter
    if (typeof v === 'string' && v.trim().length > 200) {
      return (
        <MarkdownChapter
          key={m.key}
          index={m.index}
          title={m.title}
          subtitle={m.subtitle}
          markdown={v}
          chapterLabel={`${m.index.split(' / ')[0]} / ${m.title}`}
        />
      );
    }
    // 旧構造（JSONフィールド）or null → 既存テンプレに任せる
    const Fallback = m.fallbackComponent;
    return <Fallback key={m.key} {...props} />;
  };

  return (
    <Document
      title={`DNA診断AI レポート — ${props.userInfo.fullName}`}
      author="DNA SHINDAN AI"
      subject="個人設計図レポート"
      keywords="DNA診断AI 命術 心理 個人レポート"
    >
      <CoverPage {...props} />
      <TocPage />
      {CHAPTER_META.map(renderChapter)}
      <AiMetaPage {...props} />
    </Document>
  );
}
