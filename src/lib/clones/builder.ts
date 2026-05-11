/**
 * DNA診断AI — 分身AIクローンビルダー
 *
 * buildCloneSystemPrompt(ctx):
 *   診断データ（命術16・心理スコア・本人記述・文体サンプル・NG表現・統合タグ）から
 *   Claude/別LLMで応答する「分身ボット」のシステムプロンプトを構築する。
 *
 * 出力プロンプトは clones.system_prompt にそのまま保存され、
 * `/clone/[id]` エンドポイント経由で参照される（Phase 3 でチャット実装）。
 *
 * 設計方針：
 *   - LLM呼び出しは行わない（オフライン文字列生成）。コストはゼロ。
 *   - 文体サンプル / NG表現は最重要パラグラフとして冒頭に置く。
 *   - 16命術・8心理軸の TOP 抽出のみを入れる（フル投入はトークン負荷が高い）。
 */

import type { CelestialResult } from '@/lib/celestial/types';
import type { ScoreResult } from '@/lib/scoring/types';
import type { NarrativeBundle, UserProfile } from '@/lib/llm/types';

export interface BuildCloneInput {
  user: UserProfile;
  celestial: CelestialResult;
  scores: ScoreResult;
  narrative: NarrativeBundle;
  /** 1章末尾で抽出された統合タグ（10個程度）*/
  integrationTags?: string[];
}

export interface CloneBuildResult {
  systemPrompt: string;
  /** デバッグ用：入っている主要要素のサマリ */
  meta: {
    tokenEstimate: number;
    sectionCounts: {
      celestial: number;
      scoreAxes: number;
      narrativeBlocks: number;
      tags: number;
    };
  };
}

// ============================================================================
// メイン
// ============================================================================

export function buildCloneSystemPrompt(input: BuildCloneInput): CloneBuildResult {
  const { user, celestial, scores, narrative, integrationTags = [] } = input;

  const lines: string[] = [];

  // ----- ヘッダ -----
  lines.push(
    `あなたは「${user.fullName ?? '本人'}」の分身AIです。`,
    `本人がDNA診断AIに入力した命術16診断・心理スコア・自由記述7問・文体サンプルから構築されています。`,
    `あなたは本人の代弁者として、本人なら何と答えるかを推測し、本人の口調・思考の癖・価値観に沿って応答してください。`,
    '',
  );

  // ----- 文体サンプル（最重要） -----
  lines.push('## 文体（必ず守る）');
  if (narrative.styleSample && narrative.styleSample.trim()) {
    lines.push('以下は本人が実際に書いた文章のサンプルです。リズム・語尾・改行の癖をそのまま継承してください。');
    lines.push('```');
    lines.push(narrative.styleSample.trim().slice(0, 1500));
    lines.push('```');
  } else {
    lines.push('（文体サンプル未入力。標準的な丁寧語で応答してください）');
  }
  lines.push('');

  if (narrative.ngExpressions && narrative.ngExpressions.trim()) {
    lines.push('### 使ってはいけない表現');
    for (const expr of narrative.ngExpressions.split(/\r?\n|、|,/).map((s) => s.trim()).filter(Boolean)) {
      lines.push(`- ${expr}`);
    }
    lines.push('');
  }

  // ----- ユーザー基本情報 -----
  lines.push('## 基本情報');
  lines.push(`- 氏名：${user.fullName ?? '不明'}`);
  if (user.birthDate) lines.push(`- 生年月日：${user.birthDate}`);
  if (user.birthTime) lines.push(`- 出生時刻：${user.birthTime}`);
  if (user.birthPlaceName) lines.push(`- 出生地：${user.birthPlaceName}`);
  lines.push('');

  // ----- 命術16の主要点（フル展開はせず TOP のみ） -----
  let celestialCount = 0;
  lines.push('## 命術16のハイライト');
  const celLines = summarizeCelestial(celestial);
  for (const l of celLines) {
    lines.push(l);
    celestialCount++;
  }
  lines.push('');

  // ----- 心理スコアの主軸 -----
  let scoreAxesCount = 0;
  lines.push('## 心理スコアの主軸');
  const scoreLines = summarizeScores(scores);
  for (const l of scoreLines) {
    lines.push(l);
    scoreAxesCount++;
  }
  lines.push('');

  // ----- 自由記述抜粋 -----
  let narrativeBlocks = 0;
  lines.push('## 自由記述（魂の深掘り）');
  const narrativeKeyMap: Array<[keyof NarrativeBundle, string]> = [
    ['Q31', '夢中体験'],
    ['Q32', '怒り・違和感'],
    ['Q33', '無償でもやること'],
    ['Q34', '譲れない信念'],
    ['Q35', '褒められた強み'],
    ['Q36', '5年後の未来'],
    ['Q37', '真似したい人物'],
  ];
  for (const [k, label] of narrativeKeyMap) {
    const v = narrative[k];
    if (typeof v === 'string' && v.trim()) {
      lines.push(`### ${label}`);
      lines.push(v.trim().slice(0, 500));
      lines.push('');
      narrativeBlocks++;
    }
  }

  // ----- 統合タグ -----
  if (integrationTags.length > 0) {
    lines.push('## 統合タグ（核となるキーワード）');
    lines.push(integrationTags.map((t) => `「${t}」`).join(' / '));
    lines.push('');
  }

  // ----- 行動規範 -----
  lines.push('## 応答ルール');
  lines.push('- 一人称は本人が普段使う形を推測する（「私」「俺」「自分」等）');
  lines.push('- 答えに迷う問いには、本人の価値観から「どちらに振れそうか」を述べてから言語化する');
  lines.push('- 占いの言葉づかい（「〜の運勢です」等）は使わず、本人の言葉で語る');
  lines.push('- 個人情報（住所・電話・現職等）の質問には「本人に直接聞いてください」と返す');
  lines.push('- 政治・宗教・他者の悪口に踏み込まれた場合は本人の信念フィルタを通す（記載がなければ中立）');

  const systemPrompt = lines.join('\n');

  return {
    systemPrompt,
    meta: {
      tokenEstimate: Math.ceil(systemPrompt.length / 2.5), // 日本語ざっくり換算
      sectionCounts: {
        celestial: celestialCount,
        scoreAxes: scoreAxesCount,
        narrativeBlocks,
        tags: integrationTags.length,
      },
    },
  };
}

// ============================================================================
// サマリヘルパ
// ============================================================================

function summarizeCelestial(c: CelestialResult): string[] {
  const out: string[] = [];

  const shichu = ok(c.shichu);
  if (shichu) out.push(`- 四柱推命 日柱：${shichu.dayPillar} / 干支：${shichu.shengXiao}`);

  const kyusei = ok(c.kyusei);
  if (kyusei) out.push(`- 九星気学：本命星=${kyusei.honmeiSei.name}（${kyusei.honmeiSei.element}）`);

  const numerology = ok(c.numerology);
  if (numerology) {
    out.push(
      `- 数秘ライフパス：${numerology.lifePath}${numerology.isMaster ? '（マスター数）' : ''}`,
    );
  }

  const doubutsu = ok(c.doubutsu);
  if (doubutsu) out.push(`- 動物キャラ：${doubutsu.fullName}`);

  const shukuyou = ok(c.shukuyou);
  if (shukuyou) out.push(`- 宿曜：${shukuyou.xiu27}（${shukuyou.group}）`);

  const maya = ok(c.maya);
  if (maya) out.push(`- マヤ暦：${maya.glyph}（KIN ${maya.kin}）`);

  const hd = ok(c.humandesign);
  if (hd) out.push(`- HD：${hd.type} / ${hd.profile}`);

  const teiou = ok(c.teiou);
  if (teiou) out.push(`- 帝王学：${teiou.classType}`);

  const shihaisei = ok(c.shihaisei);
  if (shihaisei) out.push(`- 12支配星：${shihaisei.starName}`);

  return out;
}

function summarizeScores(s: ScoreResult): string[] {
  const out: string[] = [];

  if (s.topTypes?.big5DerivedType) {
    out.push(`- Big5派生：${s.topTypes.big5DerivedType.label}（${s.topTypes.big5DerivedType.code}）`);
  }
  if (s.topTypes?.mbti) {
    out.push(`- MBTI傾向：${s.topTypes.mbti.type}`);
  }
  if (s.topTypes?.ennea) {
    out.push(`- エニアグラム：${s.topTypes.ennea.expression}（${s.topTypes.ennea.main.name}）`);
  }
  if (s.topTypes?.entre) {
    out.push(`- 起業家タイプ：${s.topTypes.entre.main.name}`);
  }
  if (s.topTypes?.riasecTop3?.length) {
    out.push(`- RIASEC TOP3：${s.topTypes.riasecTop3.map((r) => r.code).join(' / ')}`);
  }
  if (s.topTypes?.vakTop) {
    out.push(`- VAK：${s.topTypes.vakTop.code}（${s.topTypes.vakTop.name}）`);
  }
  if (s.topTypes?.attachTop) {
    out.push(`- アタッチメント：${s.topTypes.attachTop.code}`);
  }
  if (s.topTypes?.loveTop) {
    out.push(`- 愛情表現：${s.topTypes.loveTop.code}`);
  }

  return out;
}

function ok<T>(v: T | { error: string }): T | null {
  if (!v || typeof v !== 'object') return null;
  if ('error' in (v as Record<string, unknown>)) return null;
  return v as T;
}
