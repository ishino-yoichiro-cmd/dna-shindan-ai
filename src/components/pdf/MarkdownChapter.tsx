// LLM生成のMarkdownテキストをPDFに展開する汎用章コンポーネント
// 視認性強化版：見出し階層・コールアウト・カード・引用・表・キーワードチップ・水平線
//
// 拡張Markdown記法（標準MDに加えてレポート専用）：
//   ## 見出し         → 紺＋金縦バー＋金アンダーライン（h2）
//   ### サブ見出し    → ワンサイズ大きな太字（h3・装飾なし）
//   #### 小見出し     → 紺薄＋細字（h4）
//   > 引用            → 金左バー＋淡い背景の Quote
//   - / * / ・ リスト → ▸印＋紺強調インライン
//   1. / 2.           → 番号バッジ付きリスト
//   | a | b |         → 表（最初の行=ヘッダー）
//   :::callout 種別   → 種別別コールアウト（info/core/warn）
//   本文 :::
//   ::tag a, b, c::   → キーワードチップ群
//   --- / ***         → 水平線

import React from 'react';
import { Link, Page, Text, View } from '@react-pdf/renderer';
import { styles, colors } from './styles';
import { ChapterHeader, ChapterFooter } from './common';

interface Props {
  index: string;
  title: string;
  subtitle?: string;
  markdown: string;
  chapterLabel: string;
}

type ParseNode = React.ReactNode;

// ============================================================
// 前処理：LLM出力の問題を正規化してからパースする
// ============================================================
function preprocessMarkdown(md: string): string {
  // === 前処理 -1: HTMLコメントを最初に完全除去（INTEGRATION_TAGS等が本文に漏れる致命的バグ対策）===
  let md2 = md.replace(/<!--[\s\S]*?-->/g, '');
  // <br>タグの処理：テーブル行内（|で始まる行）は空白に、それ以外は改行に変換
  // MarkdownテーブルはHTMLと異なりセル内改行を認識しないため、テーブル行ではスペースで結合する
  // ※ 旧バグ（\s{2,}→スペース）によりDBデータでは「テーブル行 + 後続テキスト」が1行に連結している場合があるため
  //   末尾が|でなくても|で始まる行はテーブル行として扱う
  md2 = md2.split('\n').map(line => {
    if (line.trim().startsWith('|')) {
      // テーブル行: <br>を空白に変換して行を壊さない
      return line.replace(/<br\s*\/?>/gi, ' ');
    }
    // 通常行: <br>を改行に変換
    return line.replace(/<br\s*\/?>/gi, '\n');
  }).join('\n');
  // その他のインラインHTMLタグを完全除去
  md2 = md2.replace(/<[^>]+>/g, '');

  // === 前処理 -0.9: ##heading（スペースなし）を ## heading（スペースあり）に正規化 ===
  // LLMが "##見出し" と出力するケースへの対処（パーサーは "## " を要求するため）
  // "##" の直後が非スペース・非# であれば強制的にスペースを挿入
  md2 = md2.replace(/^(#{1,4})([^\s#\n])/gm, '$1 $2');
  // 行中に埋め込まれた ##heading も対処（文字の後に ## が続くケース）
  md2 = md2.replace(/([^\n#])(#{1,4})([^\s#\n ])/g, '$1\n\n$2 $3');

  // === 前処理 -0.5: 禁止セクションを除去（初回プロンプト例・コピペ定型文）===
  // LLMが出力した既存DBデータにも含まれる可能性があるため、レンダリング時に除去
  const BANNED_SECTION_PATTERNS = [
    /初回プロンプト例/,
    /コピペで送れる定型文/,
  ];
  // 見出し（##/###/####）の行でBANNED_SECTION_PATTERNSにマッチしたら、次の見出しまでスキップ
  const md2Lines = md2.split('\n');
  const filteredLines: string[] = [];
  let skipUntilHeading = false;
  for (const line of md2Lines) {
    const isHeading = /^#{1,4} /.test(line);
    if (isHeading) {
      const isBanned = BANNED_SECTION_PATTERNS.some(p => p.test(line));
      if (isBanned) {
        skipUntilHeading = true;
        continue;
      }
      skipUntilHeading = false;
    }
    if (!skipUntilHeading) {
      filteredLines.push(line);
    }
  }
  md2 = filteredLines.join('\n');

  // === 前処理-0.3: テーブル行の末尾後続テキストを分離 ===
  // 旧バグ（\s{2,}→スペース）により「テーブル行|後続テキスト」が1行に連結しているDBデータへの対処
  // テーブル行が最後の|の後にテキストを持つ場合、その部分を次の段落として分離する
  md2 = md2.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) return line;
    const lastPipeIdx = trimmed.lastIndexOf('|');
    if (lastPipeIdx === trimmed.length - 1) return line; // 末尾|で終わる正常行
    const tablePart = trimmed.slice(0, lastPipeIdx + 1);
    const remainder = trimmed.slice(lastPipeIdx + 1).trim();
    if (!remainder) return line;
    // テーブル部分に | が2つ以上ある（有効なテーブル行）かチェック
    if ((tablePart.match(/\|/g) ?? []).length >= 2) {
      return tablePart + '\n\n' + remainder;
    }
    return line;
  }).join('\n');

  // === 前処理0: 行中に埋め込まれた見出し・箇条書きを別行に分割 ===
  // LLMが "テキスト ### 見出し テキスト ・箇条" のように1行に詰め込む問題への対処
  // 行中の ## / ### → 直前に空行+改行を挿入（行頭の場合は除外）
  // [^\n#] とすることで、行頭の ### (#が[^\n]にマッチしてしまうバグ) を防ぐ
  md2 = md2.replace(/([^\n#])(#{2,4} )/g, '$1\n\n$2');
  // 見出し直後に本文が続いている場合を分割
  // LLMが "### 見出しテキスト 本文本文本文..." のように1行に詰め込む問題への対処
  // 日本語の見出しはスペースを含まないため、8文字以上の非スペース文字列＋スペース＋15文字以上の本文で分割
  md2 = md2.replace(/^(#{2,4} )(\S{4,})([ 　])(.{15,})$/gm, (_, marker, heading, _sp, body) => {
    return `${marker}${heading.trim()}\n\n${body.trim()}`;
  });
  // 日本語見出し＋本文が空白なしで連続している場合を強制分割（上の regex が取りこぼすケース）
  // 例: "## あなたの強み生まれながらにして..." → "## あなたの強み\n\n生まれながらにして..."
  md2 = md2.replace(/^(#{2,4} )(.{20,})$/gm, (whole, marker, content) => {
    // 句読点（。！？）での分割を優先（見出し内の自然な区切り位置）
    for (let i = 5; i <= Math.min(18, content.length - 1); i++) {
      if ('。！？'.includes(content[i])) {
        const headingPart = content.slice(0, i + 1).trim();
        const bodyPart = content.slice(i + 1).trim();
        if (bodyPart.length >= 10) return `${marker}${headingPart}\n\n${bodyPart}`;
      }
    }
    // 句読点がなければ14文字目で強制分割（見出しタイトルと本文の境界として）
    if (content.length > 24) {
      const headingPart = content.slice(0, 14).trim();
      const bodyPart = content.slice(14).trim();
      if (bodyPart.length >= 10) return `${marker}${headingPart}\n\n${bodyPart}`;
    }
    return whole;
  });
  // 行中の ・ → 直前に改行を挿入（行頭の ・ はそのまま）
  // ※ テーブル行（|...|）は <br>→ス ペース変換で既に ・ が含まれる場合があるため除外
  md2 = md2.split('\n').map(line => {
    if (line.trim().startsWith('|')) return line; // テーブル行は保護（末尾|有無問わず）
    return line.replace(/([^\n・])\s+(・)/g, '$1\n$2');
  }).join('\n');

  // === 前処理0.3: 文末に埋め込まれた > 引用マーカーを行頭に分離 ===
  // LLMが「テキスト。> 「引用」」のように1行に詰めるケースへの対処
  // parseMarkdown は > を行頭でしか認識しないため、ここで分離してから渡す
  md2 = md2.replace(/([。！？」）])\s*>\s+/g, '$1\n\n> ');

  // === 前処理0.5: 長い段落行を文単位で2文ずつ段落化 ===
  // LLMが改行なしで複数文を1行に出力するケース（全文字が1〜数行の場合）の対策
  // 句点（。！？）を文末として検出し、2文ずつ段落化する
  // 閉じ括弧（」）』）直前の句点は文末扱いしない（引用内の句点を誤分割しないため）
  {
    const LONG_THRESH = 100; // この文字数を超える行を処理対象とする
    const SENTENCES_PER_PARA = 2; // 1段落あたりの文数
    const rawLines = md2.split('\n');
    const rebuilt: string[] = [];
    for (const line of rawLines) {
      // 見出し・リスト・表・コールアウト行はスキップ
      if (/^(#{1,4} |[-*] |[0-9]+[.)]\s|\||>|:::)/.test(line.trim())) {
        rebuilt.push(line);
        continue;
      }
      if (line.length <= LONG_THRESH) {
        rebuilt.push(line);
        continue;
      }
      // 句点（。！？）で文を分割する
      // 閉じ括弧（」）』）の直前は文末ではないためスキップ
      // 例: 「完璧です。」→ 分割しない / 「問題ありません。次の」→ 分割する
      const splitLine = line.replace(/([。！？])(?![」）』」）])/g, '$1\n');
      const sentences = splitLine.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      if (sentences.length <= 1) {
        rebuilt.push(line);
        continue;
      }
      // SENTENCES_PER_PARA 文ずつグループ化して段落間に空行を挿入
      for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARA) {
        const group = sentences.slice(i, i + SENTENCES_PER_PARA).join('').trim();
        if (group) rebuilt.push(group);
        if (i + SENTENCES_PER_PARA < sentences.length) rebuilt.push(''); // 段落間空行
      }
    }
    md2 = rebuilt.join('\n');
  }

  const lines = md2.split('\n');
  const cleaned: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 空の引用行（"> " だけ、または ">" だけ）を除去
    if (/^>\s*$/.test(line.trim())) continue;

    // 行末の「-」を除去（文章途中の改行ハイフン）
    line = line.replace(/-\s*$/, '');

    // ジャーゴン置換（PDFレンダリング時の最終安全網）
    line = line
      // Big5 関連
      .replace(/Big5の?「/g, '「')
      .replace(/Big5で([^「])/g, '$1')
      .replace(/Big5（[^）]*）/g, '')
      .replace(/Big5\s*/g, '人格特性として')
      // Big5 コード表記（例：開放性(「O」)、感情の安定性(「N」) など）
      .replace(/開放性[（(]「?O」?[）)]/g, '好奇心の高さ')
      .replace(/感情の安定性[（(]「?N」?[）)]/g, '精神的な安定性')
      .replace(/協調性[（(]「?A」?[）)]/g, '対人的な協調性')
      .replace(/誠実性[（(]「?C」?[）)]/g, '誠実さ')
      .replace(/外向性[（(]「?E」?[）)]/g, '社交性')
      // 残留するBig5コード括弧を除去
      .replace(/[（(]「[ONASCE]」[）)]/g, '')
      // RIASEC 関連
      .replace(/RIASECの?「/g, '「')
      .replace(/RIASEC[のの]?職業適性プロファイルでは[、,]?\s*/g, '職業適性の観点では、')
      .replace(/RIASEC[のの]?\s*/g, '')
      // アタッチメント系
      .replace(/複雑なアタッチメントパターン/g, '複雑な関係性のパターン')
      .replace(/アタッチメントパターン/g, '関係性のパターン')
      .replace(/アタッチメントスタイル/g, '関係性のスタイル')
      .replace(/At-Sec[（(][^）)]*[）)]/g, '')
      .replace(/At-Sec/g, '')
      .replace(/安定型アタッチメントの現れ/g, '安定した関係性の現れ')
      .replace(/安定型アタッチメント/g, '安定した関係性')
      // エニアグラム（番号あり・なし・説明文付きを全除去）
      .replace(/エニアグラムの?[（(][^）)]*[）)]/g, '')
      .replace(/エニアグラムタイプ[0-9]*/g, '')
      .replace(/エニアグラム[0-9]*番?/g, '')
      .replace(/[（(]エニアグラムタイプ[0-9]?[）)]/g, '')
      .replace(/エニアグラム/g, '')
      // アタッチメント（全バリアント除去）
      .replace(/アタッチメント/g, '関係性')
      // ナラティブ（意味不明な専門用語として除去）
      .replace(/あなたのナラティブ/g, 'あなたの言葉')
      .replace(/ナラティブデータ/g, '記述データ')
      .replace(/ナラティブ/g, '自己記述');

    // ★ ** は除去しない → renderInline で太字として描画する
    // 孤立した ** はrenderInline内で安全網除去

    // 「30ページ」「約30ページ」などの表記を「50ページ以上」に統一
    line = line.replace(/約?30ページ[以上]?/g, '50ページ以上');
    line = line.replace(/30ページ[以上]?/g, '50ページ以上');

    // 中黒+番号の正規化（・1. テキスト → 1. テキスト）
    line = line.replace(/^(\s*)・(\d+[.)]\s)/, '$1$2');

    // ・ で始まるリストを - に変換（パーサーが処理できるよう）
    if (/^・/.test(line.trim())) {
      line = line.replace(/^(\s*)・/, '$1- ');
    }

    cleaned.push(line);
  }

  // 連続する空行を最大1行に圧縮
  const normalized: string[] = [];
  let prevEmpty = false;
  for (const line of cleaned) {
    const isEmpty = line.trim() === '';
    if (isEmpty && prevEmpty) continue;
    normalized.push(line);
    prevEmpty = isEmpty;
  }

  // 空行なし連続10行超の段落に自動空行を挿入
  // （LLMが空行を忘れた場合の安全網。。を句点として分割）
  const autoSpaced: string[] = [];
  let consecutiveNonBlank = 0;
  for (let i = 0; i < normalized.length; i++) {
    const line = normalized[i];
    const isBlank = line.trim() === '';
    const isStructural = /^(#{1,4} |[-*] |[0-9]+[.)]\s|\||:::)/.test(line.trim());
    if (isBlank) {
      consecutiveNonBlank = 0;
      autoSpaced.push(line);
    } else if (isStructural) {
      // 構造行（見出し・リスト・表）は空行挿入しない
      consecutiveNonBlank = 0;
      autoSpaced.push(line);
    } else {
      consecutiveNonBlank++;
      autoSpaced.push(line);
      // 5行連続＋文末句読点で空行挿入、7行ハードキャップ（10行以内で必ず区切り）
      const endsWithPunct = /[。！？」]$/.test(line);
      if ((consecutiveNonBlank >= 5 && endsWithPunct) || consecutiveNonBlank >= 7) {
        autoSpaced.push('');
        consecutiveNonBlank = 0;
      }
    }
  }

  return autoSpaced.join('\n');
}

function parseMarkdown(md: string): ParseNode[] {
  const processed = preprocessMarkdown(md);
  const lines = processed.split('\n');
  const nodes: ParseNode[] = [];
  let para: string[] = [];
  let listItems: string[] = [];
  let numberedItems: string[] = [];
  let tableRows: string[][] = [];
  let inTable = false;
  let quoteBuffer: string[] = []; // 連続する > 行をまとめる

  // コールアウトブロック（::: 開始 / ::: 終了）
  let inCallout = false;
  let calloutKind: 'info' | 'core' | 'warn' = 'info';
  let calloutBody: string[] = [];

  let key = 0;

  const flushPara = (fromBlankLine = false) => {
    if (para.length === 0) {
      // 空行で para が空 → スペーサー（明示的な段落間空白・1行分のみ）
      if (fromBlankLine) nodes.push(<Spacer key={key++} />);
      return;
    }
    // 日本語は単語間にスペース不要。結合のみ（mid-sentence改行解消）
    const text = para.join('').trim();
    if (text) {
      nodes.push(<Paragraph key={key++} text={text} />);
      // ※ 自動Spacerは挿入しない。ParagraphのmarginBottomで段落間を確保。
      // 空行がある場合のみ fromBlankLine=true で呼ばれ、上のSpacerが1つ入る。
    }
    para = [];
  };
  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(<List key={key++} items={listItems} />);
    listItems = [];
  };
  const flushNumbered = () => {
    if (numberedItems.length === 0) return;
    nodes.push(<NumberedList key={key++} items={numberedItems} />);
    numberedItems = [];
  };
  const flushTable = () => {
    if (tableRows.length === 0) return;
    nodes.push(<Table key={key++} rows={tableRows} />);
    tableRows = [];
    inTable = false;
  };
  const flushQuote = () => {
    if (quoteBuffer.length === 0) return;
    // 空行のみの引用はスキップ
    const content = quoteBuffer.filter(l => l.trim() !== '').join('\n');
    if (content) nodes.push(<Quote key={key++} text={content} />);
    quoteBuffer = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushNumbered();
    flushTable();
    flushQuote();
  };
  const flushCallout = () => {
    if (calloutBody.length === 0) return;
    nodes.push(
      <Callout
        key={key++}
        kind={calloutKind}
        text={calloutBody.join('\n').trim()}
      />,
    );
    calloutBody = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // コールアウト中：::: で閉じる、それ以外は本文蓄積
    if (inCallout) {
      if (line.trim() === ':::') {
        flushCallout();
        inCallout = false;
        continue;
      }
      calloutBody.push(line);
      continue;
    }

    // コールアウト開始 ::: info / ::: core / ::: warn
    const calloutOpen = line.match(/^:::\s*(info|core|warn)\s*$/);
    if (calloutOpen) {
      flushAll();
      calloutKind = (calloutOpen[1] as 'info' | 'core' | 'warn') ?? 'info';
      inCallout = true;
      continue;
    }

    // キーワードチップ群 ::tag a, b, c::
    const tagMatch = line.match(/^::tag\s+(.+?)::\s*$/);
    if (tagMatch) {
      flushAll();
      const tags = tagMatch[1]
        .split(/[,、]/)
        .map((t) => t.trim())
        .filter(Boolean);
      nodes.push(<ChipRow key={key++} tags={tags} />);
      continue;
    }

    // 水平線
    if (/^(\s*)(---|\*\*\*|___)(\s*)$/.test(line)) {
      flushAll();
      nodes.push(<Divider key={key++} />);
      continue;
    }

    // テーブル行：| col1 | col2 |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushPara();
      flushList();
      flushNumbered();
      const cells = line.trim().split('|').slice(1, -1).map((c) => c.trim());
      // セパレータ行 |---|---| はスキップ
      if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
      tableRows.push(cells);
      inTable = true;
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (line.trim() === '') {
      flushPara(true);
      flushList();
      flushNumbered();
      flushQuote();
      continue;
    }

    if (line.startsWith('#### ')) {
      flushAll();
      nodes.push(<H4 key={key++} text={line.slice(5).trim()} />);
      continue;
    }
    if (line.startsWith('### ')) {
      flushAll();
      nodes.push(<H3 key={key++} text={line.slice(4).trim()} />);
      continue;
    }
    if (line.startsWith('## ')) {
      flushAll();
      nodes.push(<H2 key={key++} text={line.slice(3).trim()} />);
      continue;
    }
    if (line.startsWith('# ')) {
      flushAll();
      nodes.push(<H2 key={key++} text={line.slice(2).trim()} />);
      continue;
    }

    // 番号付きリスト「1. 」「1) 」
    const numMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (numMatch) {
      flushPara();
      flushList();
      numberedItems.push(numMatch[2].trim());
      continue;
    } else if (numberedItems.length > 0 && line.match(/^\s+\S/)) {
      // インデント継続行：直前の項目に連結
      numberedItems[numberedItems.length - 1] += ' ' + line.trim();
      continue;
    } else {
      flushNumbered();
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushPara();
      flushNumbered();
      listItems.push(line.slice(2).trim());
      continue;
    }
    if (line.startsWith('> ')) {
      flushPara();
      flushList();
      flushNumbered();
      flushTable();
      // 連続する > 行はバッファに溜めて1つのQuoteにまとめる
      const content = line.slice(2).trim();
      if (content) quoteBuffer.push(content);
      continue;
    }
    flushQuote();
    flushList();
    flushNumbered();
    para.push(line.trim());
  }
  flushAll();
  if (inCallout) {
    flushCallout();
  }

  return nodes;
}

// セクションタイトル H2（目次スタイル踏襲：金縦バー＋薄い背景＋金アンダーライン）
function H2({ text }: { text: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'stretch',
        marginTop: 36,
        marginBottom: 14,
        backgroundColor: colors.calloutCoreBg,
        borderRadius: 4,
      }}
    >
      <View style={{ width: 5, backgroundColor: colors.accent, borderRadius: 4 }} />
      <View
        style={{
          flex: 1,
          paddingTop: 9,
          paddingBottom: 9,
          paddingLeft: 12,
          paddingRight: 12,
          borderBottomWidth: 0.8,
          borderBottomColor: colors.accent,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: colors.primary,
            letterSpacing: 0.5,
            lineHeight: 1.4,
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

// サブ見出し H3（目次スタイル：左3pxカラーバー＋区切り線）
function H3({ text }: { text: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 28,
        marginBottom: 11,
        paddingBottom: 6,
        borderBottomWidth: 0.4,
        borderBottomColor: colors.divider,
      }}
    >
      <View
        style={{
          width: 3,
          height: 17,
          backgroundColor: colors.catBlue,
          marginRight: 8,
          borderRadius: 1.5,
        }}
      />
      <Text
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: colors.primaryLight,
          letterSpacing: 0.3,
          lineHeight: 1.45,
          flex: 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

// 小見出し H4（紺ドット＋細字）
function H4({ text }: { text: string }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 5 }}
    >
      <View
        style={{
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: colors.primaryLight,
          marginRight: 6,
        }}
      />
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: colors.primaryLight,
          letterSpacing: 0.2,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

function Paragraph({ text }: { text: string }) {
  return (
    <Text style={{ fontSize: 10.5, fontWeight: 400, color: colors.text, marginBottom: 9, lineHeight: 1.9 }}>
      {renderInline(text)}
    </Text>
  );
}

// 段落間スペーサー（明示的な空行1行分・2行以上にならない設計）
function Spacer() {
  return <View style={{ height: 14 }} />;
}

// インライン描画
// **bold** を太字(fontWeight:700)、URL をクリッカブルLinkに変換する
function renderInline(text: string): React.ReactNode[] {
  // 行末ハイフン除去
  const cleaned = text.replace(/-\s*$/, '');

  const result: React.ReactNode[] = [];
  let keyIdx = 0;

  // **bold** パターンで分割して太字/通常を振り分ける
  // (?:[^*]|\*(?!\*))+ = ネストしない最短マッチ
  const boldSplit = cleaned.split(/(\*\*(?:[^*]|\*(?!\*))+\*\*)/g);

  for (const part of boldSplit) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      // ★ 太字セグメント — fontWeight:700 でレンダリング
      const inner = part.slice(2, -2);
      result.push(
        <Text key={keyIdx++} style={{ fontWeight: 700, color: colors.text }}>
          {inner}
        </Text>,
      );
    } else {
      // 通常セグメント（孤立した ** を除去してから URL Link変換）
      const seg = part.replace(/\*\*/g, '');
      if (!seg) continue;

      const urlPattern = /(https?:\/\/[^\s　「」（）【】、。！？]+)/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      urlPattern.lastIndex = 0;

      while ((match = urlPattern.exec(seg)) !== null) {
        if (match.index > lastIndex) {
          result.push(<Text key={keyIdx++}>{seg.slice(lastIndex, match.index)}</Text>);
        }
        result.push(
          <Link key={keyIdx++} src={match[0]} style={{ color: '#1a56cc', textDecoration: 'underline' }}>
            {match[0]}
          </Link>,
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < seg.length) {
        result.push(<Text key={keyIdx++}>{seg.slice(lastIndex)}</Text>);
      }
    }
  }

  return result.length > 0 ? result : [<Text key={0}>{cleaned.replace(/\*\*/g, '')}</Text>];
}

function List({ items }: { items: string[] }) {
  return (
    <View style={{ marginBottom: 14, marginLeft: 4, marginTop: 6 }}>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 7, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 9, color: colors.accent, fontWeight: 700, marginRight: 7, marginTop: 2 }}>
            ▸
          </Text>
          <Text style={{ flex: 1, fontSize: 10.5, color: colors.text, lineHeight: 1.8 }}>
            {renderInline(it)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// 番号付きリスト（紺背景バッジ）
function NumberedList({ items }: { items: string[] }) {
  return (
    <View style={{ marginBottom: 16, marginLeft: 2, marginTop: 4 }}>
      {items.map((it, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            marginBottom: 10,
            alignItems: 'flex-start',
          }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: colors.primary,
              marginRight: 8,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                color: colors.textInverse,
                fontWeight: 700,
              }}
            >
              {i + 1}
            </Text>
          </View>
          <Text style={{ flex: 1, fontSize: 10.5, color: colors.text, lineHeight: 1.85 }}>
            {renderInline(it)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// 引用（金色左バー＋濃い背景＋右装飾バー）
function Quote({ text }: { text: string }) {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return null;
  return (
    <View
      wrap={false}
      style={{
        backgroundColor: colors.quoteBg,
        borderLeftWidth: 4,
        borderLeftColor: colors.accent,
        borderRightWidth: 1,
        borderRightColor: colors.accentLight,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 14,
        paddingRight: 14,
        marginTop: 12,
        marginBottom: 14,
        borderRadius: 3,
        flexShrink: 0,
      }}
    >
      <Text style={{ fontSize: 8, color: colors.accent, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>
        INSIGHT
      </Text>
      {lines.map((l, i) => (
        <Text
          key={i}
          style={{
            fontSize: 10.5,
            color: colors.quote,
            lineHeight: 1.8,
            marginBottom: i === lines.length - 1 ? 0 : 4,
          }}
        >
          {renderInline(l)}
        </Text>
      ))}
    </View>
  );
}

// コールアウト（情報・核・注意）
function Callout({
  kind,
  text,
}: {
  kind: 'info' | 'core' | 'warn';
  text: string;
}) {
  const palette = {
    info: { bg: colors.calloutInfoBg, bar: colors.calloutInfo, label: 'POINT' },
    core: { bg: colors.calloutCoreBg, bar: colors.calloutCore, label: 'CORE' },
    warn: { bg: colors.calloutWarnBg, bar: colors.calloutWarn, label: 'NOTICE' },
  }[kind];
  return (
    <View
      style={{
        backgroundColor: palette.bg,
        borderLeftWidth: 4,
        borderLeftColor: palette.bar,
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 14,
        paddingRight: 14,
        marginTop: 10,
        marginBottom: 12,
        borderRadius: 3,
      }}
    >
      <Text
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          color: palette.bar,
          letterSpacing: 2,
          marginBottom: 4,
        }}
      >
        {palette.label}
      </Text>
      <Text style={{ fontSize: 10.5, color: colors.text, lineHeight: 1.7 }}>
        {renderInline(text)}
      </Text>
    </View>
  );
}

// キーワードチップ群
function ChipRow({ tags }: { tags: string[] }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 6,
        marginBottom: 10,
      }}
    >
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
  );
}

// 水平線（金アクセント付き区切り）
function Divider() {
  return (
    <View style={{ marginTop: 14, marginBottom: 14 }}>
      <View style={{ height: 0.8, backgroundColor: colors.divider }} />
      <View style={{ width: 28, height: 2, backgroundColor: colors.accent, marginTop: 3 }} />
    </View>
  );
}

// 表（最初の行をヘッダー扱い）
function Table({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  const cols = header.length;
  const colWidth = `${100 / cols}%`;
  return (
    <View
      style={{
        marginTop: 10,
        marginBottom: 14,
        borderWidth: 0.5,
        borderColor: colors.divider,
        borderRadius: 4,
        // overflow:'hidden' は react-pdf のページ境界で先頭・末尾行のボーダーを欠落させるため除去
      }}
      wrap={false}
    >
      <View style={{ flexDirection: 'row', backgroundColor: colors.primary }} wrap={false}>
        {header.map((h, i) => (
          <Text
            key={i}
            style={{
              width: colWidth as `${number}%`,
              fontSize: 9.5,
              fontWeight: 700,
              color: colors.textInverse,
              padding: 7,
              borderRightWidth: 0.5,
              borderRightColor: colors.primaryLight,
              letterSpacing: 0.3,
            }}
          >
            {h.replace(/\*\*/g, '')}
          </Text>
        ))}
      </View>
      {body.map((row, ri) => (
        <View
          key={ri}
          style={{
            flexDirection: 'row',
            backgroundColor: ri % 2 === 0 ? colors.background : colors.backgroundCard,
            borderTopWidth: 0.5,
            borderTopColor: colors.divider,
          }}
        >
          {row.map((cell, ci) => (
            <Text
              key={ci}
              style={{
                width: colWidth as `${number}%`,
                fontSize: 9.5,
                color: colors.text,
                padding: 7,
                borderRightWidth: 0.5,
                borderRightColor: colors.divider,
                lineHeight: 1.55,
              }}
            >
              {cell.replace(/\*\*/g, '')}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function MarkdownChapter({ index, title, subtitle, markdown, chapterLabel }: Props) {
  // 外側Viewで包むと @react-pdf/renderer の自動 wrap が無効化され、
  // ページまたぎで文章が途中切れする。本文は Page の直接の子として並べる。
  return (
    <Page size="A4" style={styles.page} wrap>
      <ChapterHeader index={index} title={title} subtitle={subtitle} />
      {parseMarkdown(markdown)}
      <ChapterFooter chapterLabel={chapterLabel} />
    </Page>
  );
}
