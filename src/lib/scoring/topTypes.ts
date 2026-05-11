// トップタイプ判定：MBTI 16タイプ / エニア主+ウィング / 起業家メイン+サブ / Big5 16派生 / RIASEC top3 / VAK / アタッチ / 愛情

import type {
  Big5Axis,
  EnneaAxis,
  RiasecAxis,
  VakAxis,
  AttachAxis,
  LoveAxis,
  EntreAxis,
} from '@/data/questions';
import { ENNEA_META, ENTRE_META } from '@/data/questions';
import type {
  RawScores,
  TopTypes,
  MbtiResult,
  EnneaResult,
  EntreResult,
  Big5DerivedType,
} from './types';

// ===== MBTI 16タイプ判定 =====
// MBTI raw scoreは正値=E/S/T/J、負値=I/N/F/P
// strengthは絶対値を 0-100 にスケーリング（同グループ内のmaxを基準）
export function judgeMbti(raw: RawScores): MbtiResult {
  const { mbti } = raw;
  const ei = mbti.EI;
  const sn = mbti.SN;
  const tf = mbti.TF;
  const jp = mbti.JP;

  const absMax = Math.max(Math.abs(ei), Math.abs(sn), Math.abs(tf), Math.abs(jp), 1);

  const eiLetter: 'E' | 'I' = ei >= 0 ? 'E' : 'I';
  const snLetter: 'S' | 'N' = sn >= 0 ? 'S' : 'N';
  const tfLetter: 'T' | 'F' = tf >= 0 ? 'T' : 'F';
  const jpLetter: 'J' | 'P' = jp >= 0 ? 'J' : 'P';

  const type = `${eiLetter}${snLetter}${tfLetter}${jpLetter}`;

  return {
    type,
    axes: {
      EI: { letter: eiLetter, strength: Math.round((Math.abs(ei) / absMax) * 100) },
      SN: { letter: snLetter, strength: Math.round((Math.abs(sn) / absMax) * 100) },
      TF: { letter: tfLetter, strength: Math.round((Math.abs(tf) / absMax) * 100) },
      JP: { letter: jpLetter, strength: Math.round((Math.abs(jp) / absMax) * 100) },
    },
  };
}

// ===== エニアグラム主+ウィング判定 =====
// 主タイプ：最高スコア
// ウィング：主タイプの隣接（±1）のうちスコアが高い方
// 例：主が5なら 4 or 6
export function judgeEnnea(raw: RawScores): EnneaResult {
  const entries = (Object.entries(raw.ennea) as [EnneaAxis, number][])
    .sort((a, b) => b[1] - a[1]);

  const [mainCode, mainScore] = entries[0];
  const mainNum = Number(mainCode.slice(1));

  // 隣接（モジュロ9）
  const wingNums = [
    mainNum === 1 ? 9 : mainNum - 1,
    mainNum === 9 ? 1 : mainNum + 1,
  ] as number[];
  const wingCandidates = wingNums.map((n) => `E${n}` as EnneaAxis);
  const wing = wingCandidates
    .map((c) => ({ code: c, score: raw.ennea[c] }))
    .sort((a, b) => b.score - a.score)[0];

  return {
    main: {
      code: mainCode,
      name: ENNEA_META[mainCode].name,
      score: mainScore,
    },
    wing: wing && wing.score > 0
      ? { code: wing.code, name: ENNEA_META[wing.code].name, score: wing.score }
      : null,
    expression: wing && wing.score > 0
      ? `${mainNum}w${wing.code.slice(1)}`
      : `${mainNum}`,
  };
}

// ===== 起業家8タイプ：メイン+サブ =====
export function judgeEntre(raw: RawScores): EntreResult {
  const entries = (Object.entries(raw.entre) as [EntreAxis, number][])
    .sort((a, b) => b[1] - a[1]);

  const [mainCode, mainScore] = entries[0];
  const [subCode, subScore] = entries[1];

  return {
    main: {
      code: mainCode,
      name: ENTRE_META[mainCode].name,
      subtitle: ENTRE_META[mainCode].subtitle,
      score: mainScore,
    },
    sub: {
      code: subCode,
      name: ENTRE_META[subCode].name,
      subtitle: ENTRE_META[subCode].subtitle,
      score: subScore,
    },
  };
}

// ===== Big5 から16タイプ独自命名（MBTI回避） =====
// O/C/E/A/N の5因子のうち、4因子（OCEA）を高低で4ビット → 16通り
// 仕様書の指定：「Big Five 5因子（OCEAN）→ そこから「16タイプ性格」を導出（MBTI回避命名）」
const BIG5_16_NAMES: Record<string, string> = {
  // OCEA順 / + - / O+C+E+A+ から O-C-E-A-
  'O+C+E+A+': '革新リーダー',
  'O+C+E+A-': '挑発創造者',
  'O+C+E-A+': '思索建築家',
  'O+C+E-A-': '孤高戦略家',
  'O+C-E+A+': '冒険ナビゲーター',
  'O+C-E+A-': '自由放浪者',
  'O+C-E-A+': '夢想吟遊者',
  'O+C-E-A-': '反逆思想家',
  'O-C+E+A+': '実直伝道者',
  'O-C+E+A-': '統率指揮官',
  'O-C+E-A+': '誠実守護者',
  'O-C+E-A-': '硬骨職人',
  'O-C-E+A+': '陽気世話人',
  'O-C-E+A-': '行動猛者',
  'O-C-E-A+': '寡黙協調者',
  'O-C-E-A-': '独立漂流者',
};

export function judgeBig5DerivedType(raw: RawScores): Big5DerivedType {
  // 各因子の中央値を 0 として正負判定
  // raw.big5 はそのまま使う（Nは別軸として扱い、4因子のみ用いる）
  const factors: Big5Axis[] = ['O', 'C', 'E', 'A'];
  const sig = factors.map((f) => `${f}${raw.big5[f] >= 0 ? '+' : '-'}`).join('');
  const label = BIG5_16_NAMES[sig] ?? '未分類';
  return { code: sig, label };
}

// ===== RIASEC TOP3 =====
const RIASEC_NAMES: Record<RiasecAxis, string> = {
  R: '現実的（Realistic）',
  I: '研究的（Investigative）',
  A: '芸術的（Artistic）',
  S: '社会的（Social）',
  EE: '企業的（Enterprising）',
  Co: '慣習的（Conventional）',
};

export function judgeRiasecTop3(raw: RawScores): { code: RiasecAxis; name: string; score: number }[] {
  const entries = (Object.entries(raw.riasec) as [RiasecAxis, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return entries.map(([code, score]) => ({
    code,
    name: RIASEC_NAMES[code],
    score,
  }));
}

// ===== VAK TOP =====
const VAK_NAMES: Record<VakAxis, string> = {
  V: '視覚優位',
  Au: '聴覚優位',
  K: '体感覚優位',
};
export function judgeVakTop(raw: RawScores): { code: VakAxis; name: string; score: number } {
  const entries = (Object.entries(raw.vak) as [VakAxis, number][])
    .sort((a, b) => b[1] - a[1]);
  const [code, score] = entries[0];
  return { code, name: VAK_NAMES[code], score };
}

// ===== アタッチメント TOP =====
const ATTACH_NAMES: Record<AttachAxis, string> = {
  'At-Sec': '安定型',
  'At-Av': '回避型',
  'At-Anx': '不安型',
  'At-Fea': '恐れ型',
};
export function judgeAttachTop(raw: RawScores): { code: AttachAxis; name: string; score: number } {
  const entries = (Object.entries(raw.attach) as [AttachAxis, number][])
    .sort((a, b) => b[1] - a[1]);
  const [code, score] = entries[0];
  return { code, name: ATTACH_NAMES[code], score };
}

// ===== 愛情表現 TOP =====
const LOVE_NAMES: Record<LoveAxis, string> = {
  'L-Time': 'クオリティ・タイム',
  'L-Word': '言葉による肯定',
  'L-Touch': '身体的接触',
  'L-Gift': '贈り物',
  'L-Act': '尽くす行動',
};
export function judgeLoveTop(raw: RawScores): { code: LoveAxis; name: string; score: number } {
  const entries = (Object.entries(raw.love) as [LoveAxis, number][])
    .sort((a, b) => b[1] - a[1]);
  const [code, score] = entries[0];
  return { code, name: LOVE_NAMES[code], score };
}

// ===== 統合 =====
export function judgeAllTopTypes(raw: RawScores): TopTypes {
  return {
    mbti: judgeMbti(raw),
    ennea: judgeEnnea(raw),
    entre: judgeEntre(raw),
    big5DerivedType: judgeBig5DerivedType(raw),
    riasecTop3: judgeRiasecTop3(raw),
    vakTop: judgeVakTop(raw),
    attachTop: judgeAttachTop(raw),
    loveTop: judgeLoveTop(raw),
  };
}
