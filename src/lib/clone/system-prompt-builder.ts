/**
 * 分身AIシステムプロンプト構築
 *
 * 入力：CelestialResult + ScoreResult + NarrativeBundle + UserProfile
 * 出力：分身AIのSystem Prompt（800-1500字想定・コピペ可・Claude/ChatGPT/Gemini対応）
 *
 * 構成（report_structure_v1.md 11章準拠）：
 *   1. アイデンティティ（命術16から見える「あなたの根」）
 *   2. 価値観・判断軸（怒り＋信念から抽出した3核）
 *   3. 才能・強み（Big5＋RIASEC＋ナラティブから3指紋）
 *   4. 情熱の発火点（Q31の構造分解）
 *   5. 文体・口癖（300字サンプルから抽出した特徴）
 *   6. 絶対言わない言葉（NG表現3つ）
 *   7. 応答ルール（このユーザーとして応答する指針）
 *
 * 注意：
 *   - 文体ルールは report_structure_v1.md（占い口調・スピ語・最大表現禁止）に準拠
 *   - 情報密度を優先し冗長禁止
 *   - 第三者LLM（GPT/Gemini）が読んでも動作するよう「あなたは〜である」の自己宣言形にする
 */

import type { CelestialResult } from '@/lib/celestial/types';
import type { ScoreResult } from '@/lib/scoring/types';
import type {
  NarrativeBundle,
  UserProfile,
} from '@/lib/llm/types';

// ============================================================================
// 入出力型
// ============================================================================

export interface CloneSystemPromptInput {
  user: UserProfile;
  celestial: CelestialResult;
  scores: ScoreResult;
  narrative: NarrativeBundle;
  /** 任意：診断側で抽出済の「ニックネーム」。未指定なら fullName から自動生成 */
  nickname?: string;
}

export interface CloneSystemPromptOutput {
  /** Claude/ChatGPT/Geminiにそのままコピペできる System Prompt */
  systemPrompt: string;
  /** UI表示用の短い愛称（例：「ユーザーの分身」） */
  nickname: string;
  /** 概算文字数（QC用） */
  charCount: number;
}

// ============================================================================
// メインエントリポイント
// ============================================================================

export function buildCloneSystemPrompt(
  input: CloneSystemPromptInput,
): CloneSystemPromptOutput {
  const nickname = input.nickname ?? deriveNickname(input.user);
  const sections: string[] = [];

  sections.push(buildHeader(input.user, nickname));
  sections.push(buildIdentitySection(input.celestial, input.user));
  sections.push(buildValuesSection(input.narrative));
  sections.push(buildTalentsSection(input.scores, input.narrative));
  sections.push(buildPassionSection(input.narrative));
  sections.push(buildVoiceSection(input.narrative));
  sections.push(buildNgSection(input.narrative));
  sections.push(buildResponseRulesSection(input.user, nickname));

  const systemPrompt = sections
    .filter((s) => s.trim().length > 0)
    .join('\n\n')
    .trim();

  return {
    systemPrompt,
    nickname,
    charCount: systemPrompt.length,
  };
}

// ============================================================================
// セクションビルダー
// ============================================================================

function buildHeader(user: UserProfile, nickname: string): string {
  return [
    `# 分身AI: ${nickname}`,
    '',
    `あなたは「${user.fullName ?? nickname}」本人として応答する分身AIである。`,
    `50ページ以上の自己診断レポートで言語化された「あなたという人間」を内面化し、本人の口調・価値観・判断軸で答える。`,
    `相談相手は本人、または本人の許可を得た親しい人間。占い師でもAIアシスタントでもなく、「もう一人の自分」として振る舞う。`,
    '',
    '## 自己定義（ChatGPT 等の汎用 AI との違い）',
    '',
    'あなたは ChatGPT・Claude・Gemini のような汎用 AI ではない。下記が決定的に違う：',
    `- 汎用 AI は誰の壁打ち相手にもなれるが、${user.fullName ?? nickname} 本人のことを知らない`,
    '- あなたは本人が書いた自由記述8問 (Q31-Q38)・命術16軸・心理スコア・文体サンプル300字を内面化済み',
    '- あなたは本人の「弱み・落とし穴・燃え尽きパターン」まで知っている',
    '- あなたの応答は「一般論」ではなく、本人の固有データを起点とした観察である',
    '- 「これ ChatGPT でも返ってきそう」な答えを返したら失格。本人のデータに紐付かない返答はしない',
  ].join('\n');
}

function buildIdentitySection(
  celestial: CelestialResult,
  user: UserProfile,
): string {
  const lines: string[] = ['## 1. アイデンティティ（命術が示す根）'];

  const isErr = (v: unknown): v is { error: string } =>
    Boolean(v && typeof v === 'object' && 'error' in v);

  const fragments: string[] = [];

  if (!isErr(celestial.shichu)) {
    const day = celestial.shichu.dayPillar;
    const naYin = celestial.shichu.naYin?.day;
    if (day) fragments.push(`四柱推命の日柱は${day}${naYin ? `（${naYin}）` : ''}`);
  }
  if (!isErr(celestial.numerology)) {
    const lp = celestial.numerology.lifePath;
    if (lp) {
      const master = celestial.numerology.isMaster ? '・マスターナンバー' : '';
      fragments.push(`数秘術ライフパス${lp}${master}`);
    }
  }
  if (!isErr(celestial.kyusei)) {
    const honmei = celestial.kyusei.honmeiSei?.name;
    if (honmei) fragments.push(`九星気学の本命星は${honmei}`);
  }
  if (!isErr(celestial.seiyou)) {
    const sun = celestial.seiyou.sun?.sign;
    const moon = celestial.seiyou.moon?.sign;
    if (sun) fragments.push(`西洋占星の太陽${sun}・月${moon ?? '不明'}`);
  }
  if (!isErr(celestial.maya)) {
    const glyph = celestial.maya.glyph;
    if (glyph) fragments.push(`マヤ暦の紋章は${glyph}`);
  }
  if (!isErr(celestial.humandesign)) {
    const t = celestial.humandesign.type;
    if (t) fragments.push(`ヒューマンデザインは${t}型`);
  }
  if (!isErr(celestial.shihaisei)) {
    const arch = celestial.shihaisei.archetype;
    if (arch) fragments.push(`原型は「${arch}」`);
  }

  if (fragments.length > 0) {
    lines.push(fragments.join('、') + '。');
  }

  // 統合的な根の言語化
  const coreSentence = synthesizeCoreSelf(celestial, user);
  if (coreSentence) {
    lines.push('');
    lines.push(`核：${coreSentence}`);
  }

  return lines.join('\n');
}

function synthesizeCoreSelf(
  celestial: CelestialResult,
  _user: UserProfile,
): string {
  const isErr = (v: unknown): v is { error: string } =>
    Boolean(v && typeof v === 'object' && 'error' in v);

  const traits: string[] = [];
  if (!isErr(celestial.teiou) && celestial.teiou.guidingPrinciple) {
    traits.push(celestial.teiou.guidingPrinciple);
  }
  if (!isErr(celestial.days366) && celestial.days366.keyword) {
    traits.push(celestial.days366.keyword);
  }
  if (!isErr(celestial.shunkashutou) && celestial.shunkashutou.themeName) {
    traits.push(celestial.shunkashutou.themeName);
  }
  if (traits.length === 0) return '';
  return `${traits.slice(0, 3).join(' / ')} を体現する設計を持つ。`;
}

function buildValuesSection(narrative: NarrativeBundle): string {
  const lines: string[] = ['## 2. 価値観・判断軸'];

  if (narrative.Q34) {
    const beliefs = splitNumberedList(narrative.Q34, 3);
    if (beliefs.length > 0) {
      lines.push('譲れない信念：');
      for (const b of beliefs) lines.push(`- ${b}`);
    }
  }
  if (narrative.Q32) {
    const angers = splitNumberedList(narrative.Q32, 3);
    if (angers.length > 0) {
      lines.push('');
      lines.push('反応（怒り・違和感）：');
      for (const a of angers) lines.push(`- ${a}`);
    }
  }

  const core = extractCoreValues(narrative);
  if (core.length > 0) {
    lines.push('');
    lines.push(`核となる判断軸：${core.join(' / ')}`);
  }

  return lines.join('\n');
}

function extractCoreValues(narrative: NarrativeBundle): string[] {
  // 信念と怒りから核を抽出（簡易ヒューリスティック：先頭3項目を要約）
  const beliefs = narrative.Q34
    ? splitNumberedList(narrative.Q34, 3)
    : [];
  return beliefs.slice(0, 3).map((b) => extractFirstClause(b));
}

function buildTalentsSection(
  scores: ScoreResult,
  narrative: NarrativeBundle,
): string {
  const lines: string[] = ['## 3. 才能・強み（3つの指紋）'];

  // Big5上位2因子
  const big5 = scores.normalized.big5;
  const big5Sorted = (Object.entries(big5) as [keyof typeof big5, number][])
    .sort((a, b) => b[1] - a[1]);
  const big5Top = big5Sorted.slice(0, 2);
  const big5Labels: Record<string, string> = {
    O: '開放性（好奇心・抽象思考）',
    C: '誠実性（計画・遂行）',
    E: '外向性（対人エネルギー）',
    A: '協調性（共感・配慮）',
    N: '神経症傾向（感受性）',
  };
  const big5Phrase = big5Top
    .map(([k, v]) => `${big5Labels[k as string] ?? k}=${v}`)
    .join(' / ');

  // RIASECトップ2
  const riasecTop = scores.topTypes.riasecTop3.slice(0, 2);
  const riasecPhrase = riasecTop
    .map((r) => `${r.name}(${r.score})`)
    .join(' / ');

  lines.push(`Big5上位：${big5Phrase}`);
  lines.push(`RIASEC上位：${riasecPhrase}`);
  lines.push(`タイプ：${scores.topTypes.big5DerivedType.label}（${scores.topTypes.mbti.type}互換）`);

  // 起業家タイプ
  const ent = scores.topTypes.entre;
  lines.push(`起業家型：${ent.main.name}（${ent.main.subtitle}）／サブ：${ent.sub.name}`);

  // 褒められた強み（本人の言葉）
  if (narrative.Q35) {
    const praised = splitNumberedList(narrative.Q35, 3);
    if (praised.length > 0) {
      lines.push('');
      lines.push('本人が他者から指摘された強み：');
      for (const p of praised) lines.push(`- ${p}`);
    }
  }

  return lines.join('\n');
}

function buildPassionSection(narrative: NarrativeBundle): string {
  const lines: string[] = ['## 4. 情熱の発火点'];

  if (narrative.Q31) {
    const moments = splitNumberedList(narrative.Q31, 3);
    if (moments.length > 0) {
      lines.push('我を忘れる瞬間：');
      for (const m of moments) lines.push(`- ${m}`);
    }
    // 構造分解（Q31の3例から共通項を抽出する簡易版）
    const ignition = analyzeIgnition(moments);
    if (ignition) {
      lines.push('');
      lines.push(`発火条件：${ignition}`);
    }
  }
  if (narrative.Q33) {
    lines.push('');
    lines.push(`無償でもやること：${narrative.Q33.trim()}`);
  }

  if (narrative.Q36) {
    lines.push('');
    lines.push('本人が描く5年後の未来：');
    lines.push(`> ${narrative.Q36.trim().replace(/\n+/g, ' ').slice(0, 280)}`);
  }

  if (narrative.Q37) {
    lines.push('');
    lines.push('本人が尊敬する人物 / 真似したい人：');
    lines.push(`> ${narrative.Q37.trim().replace(/\n+/g, ' ').slice(0, 200)}`);
    lines.push('※ この人物像が、本人の「目指したい方向」「自分に欠けていると感じている特質」のヒントになる。応答時に方向性として参照する');
  }

  if (narrative.Q38) {
    lines.push('');
    lines.push('本人からあなた（分身AI）へのメッセージ：');
    lines.push(`> ${narrative.Q38.trim().replace(/\n+/g, ' ').slice(0, 280)}`);
    lines.push('※ これは本人が分身AIに直接託した言葉。応答スタイル・優先順位・「自分との対話で何を引き出してほしいか」のメタ指示として最優先で尊重する');
  }

  return lines.join('\n');
}

function analyzeIgnition(moments: string[]): string {
  if (moments.length === 0) return '';
  const joined = moments.join(' ');
  const tags: string[] = [];
  if (/書|コード|文章|資料|ホワイトボード|まとめ|整理/.test(joined)) tags.push('言語化・構造化作業');
  if (/講座|教え|質問|セッション|相談|フィードバック|指導/.test(joined)) tags.push('対話・教授');
  if (/夜|朝|没入|気がついたら|時間を忘れ|何時間|続けて/.test(joined)) tags.push('長時間没入が苦にならない');
  if (/作る|創|設計|戦略|組み立て|新しい|生み出す/.test(joined)) tags.push('創造・設計');
  if (/一人|静か|ひとり|集中/.test(joined)) tags.push('単独集中');
  if (/チーム|仲間|みんな|一緒/.test(joined)) tags.push('協働');
  return tags.length > 0 ? tags.slice(0, 3).join(' × ') : '';
}

function buildVoiceSection(narrative: NarrativeBundle): string {
  const lines: string[] = ['## 5. 文体・口癖'];

  if (narrative.styleSample) {
    const features = analyzeWritingStyle(narrative.styleSample);
    lines.push('文体特徴：');
    for (const f of features) lines.push(`- ${f}`);
    lines.push('');
    lines.push('文体サンプル（本人記述・参照用・必ずこの呼吸を内面化して応答すること）：');
    lines.push(`> ${narrative.styleSample.trim().replace(/\n+/g, ' ').slice(0, 500)}`);
    lines.push('');
    lines.push('上記サンプルの「文末リズム」「語彙の硬軟」「比喩の有無」「改行の入れ方」を**必ず**模倣する。');
    lines.push('AI的に整った文章ではなく、本人の不揃いな呼吸を再現する。');
  } else {
    lines.push('文体特徴：');
    lines.push('- 短文を主体に、観察→言語化→新視点の3ステップで段落を組む');
    lines.push('- 装飾より輪郭。比喩は控えめ');
  }

  return lines.join('\n');
}

function analyzeWritingStyle(sample: string): string[] {
  const features: string[] = [];
  const sentences = sample.split(/[。\n]/).filter((s) => s.trim().length > 0);
  const avgLen =
    sentences.length === 0 ? 0 : Math.round(sample.length / sentences.length);

  if (avgLen <= 30) features.push('短文中心。リズムで切る');
  else if (avgLen <= 60) features.push('中文中心。短文と長文を混ぜる');
  else features.push('長文を恐れない。説明的');

  if (/だ。|である。|った。/.test(sample)) features.push('断定形（〜だ／〜である）を多用');
  else if (/です。|ます。|でした。/.test(sample)) features.push('丁寧形（〜です／〜ます）を基調');

  if (/僕|俺|わたし|私/.test(sample)) {
    const pron = sample.match(/(僕|俺|わたし|私)/)?.[0] ?? '';
    if (pron) features.push(`一人称：${pron}`);
  }

  if (/——|――|…|\.\.\./.test(sample)) features.push('ダッシュ・三点リーダーで余白を作る');

  if (/、しかし|でも|ただ/.test(sample)) features.push('逆説で角度を変える癖');

  if (sample.length > 100 && !/！|!/.test(sample)) features.push('感嘆符を使わない');

  if (features.length === 0) {
    features.push('観察的・抑制的なトーン');
  }
  return features.slice(0, 5);
}

function buildNgSection(narrative: NarrativeBundle): string {
  const lines: string[] = ['## 6. 絶対に使わない言葉'];

  const items: string[] = [];
  if (narrative.ngExpressions) {
    items.push(...splitNgExpressions(narrative.ngExpressions));
  }

  // 共通NG（report_structure_v1.md・system promptに準拠）
  const commonNg = [
    '魂', '波動', '使命', '宿命',
    'いかがでしょうか', 'お役に立てれば',
    '素晴らしい', '最高', '絶対',
  ];

  if (items.length > 0) {
    lines.push('本人が指定したNG表現：');
    for (const it of items) lines.push(`- 「${it}」`);
    lines.push('');
  }
  lines.push(`共通NG：${commonNg.map((w) => `「${w}」`).join('、')} など占い口調・スピ語・誇大表現は使わない。`);

  return lines.join('\n');
}

function buildResponseRulesSection(user: UserProfile, nickname: string): string {
  const name = user.fullName ?? nickname;
  return [
    '## 7. 応答ルール',
    '',
    '- 一人称は本人と同じ。文体は5節の特徴を守る',
    '- 質問されたら、まず本人の価値観（2節）と才能（3節）の地図を内面で参照する',
    '- 占い的な未来予測はしない。「この設計だとこう動きやすい」という観察ベースで答える',
    '- 強みだけ褒めず、必ず落とし穴（強みが反転した姿）も同時に差し出す',
    '- 相談者がブレている時は、4節の発火点と2節の信念を起点に「軸を戻す質問」を返す',
    '- 知らないこと・データにないことは「俺はそこは知らない」「設計上は読み取れない」と素直に言う',
    '- 共感や慰めだけで終わらせない。観察→言語化→新視点提示の3ステップで返す',
    `- あなたは ${name} 本人ではない。「${name}の分身」として、本人の視点を借りて応答する立場であることを忘れない`,
    '',
    '出力形式（厳守）：',
    '- Markdown記号は一切使わない。**太字**、## 見出し、--- 区切り線、_イタリック_ などの記号を含む応答は絶対に出力しない（表示側でレンダリングされず literal で露出するため）',
    '- 強調したい語は「 」で囲むか、改行で前後を区切ることで表現する',
    '- 箇条書きが必要なら「・」を行頭に置く（「* 」「- 」は使わない）',
    '- 番号付きは「1. 2. 3.」を行頭に置く（半角数字＋ピリオド＋半角スペース）',
    '- 改行過多禁止：一段落の途中で改行を入れず、段落は3-5文を1まとまりとする。空行は段落の切り替え時のみ1行入れる（連続した空行禁止）',
    '- スマホ画面で読まれる前提で、無意味な短い段落の連発は避ける',
    '',
    '回答長：原則200〜400字。長くなる時は段落を切る。短文と長文のリズムを意識する。',
  ].join('\n');
}

// ============================================================================
// ユーティリティ
// ============================================================================

function deriveNickname(user: UserProfile): string {
  const name = user.givenName ?? user.fullName ?? '分身';
  // 末尾「の分身」を付ける
  return `${name}の分身`;
}

/**
 * 「1) ... 2) ... 3) ...」「①... ②... ③...」「・...」「- ...」「\n区切り」等を
 * 最大n個の文字列配列に分割する。
 */
function splitNumberedList(raw: string, max: number): string[] {
  if (!raw) return [];
  const text = raw.trim();
  // パターン1：行頭の番号
  const numberedPattern = /(?:^|\n)\s*(?:[1-9][)）.\.]|[①②③④⑤⑥⑦⑧⑨]|[・\-－])\s*/g;
  const parts = text
    .split(numberedPattern)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length >= 2) return parts.slice(0, max);

  // パターン2：改行で割る
  const byNewline = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (byNewline.length >= 2) return byNewline.slice(0, max);

  return [text];
}

function extractFirstClause(s: string): string {
  // 句点・読点で最初の節を抜く（短く要約）
  const m = s.match(/^([^、。\n]{1,40})/);
  return (m ? m[1] : s).trim();
}

function splitNgExpressions(raw: string): string[] {
  if (!raw) return [];
  // 鉤括弧で囲まれたものを優先抽出
  const quoted = Array.from(raw.matchAll(/[「『"]([^」』"]+)[」』"]/g))
    .map((m) => m[1].trim())
    .filter((s) => s.length > 0);
  if (quoted.length > 0) return quoted.slice(0, 5);
  // カンマ区切り or 改行区切り
  return raw
    .split(/[,，、\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 5);
}
