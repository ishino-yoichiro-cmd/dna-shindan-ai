// 重み付け（L-Touch×1.5）と0-100正規化

import type {
  Big5Axis,
  MbtiAxis,
  EnneaAxis,
  RiasecAxis,
  VakAxis,
  AttachAxis,
  LoveAxis,
  EntreAxis,
} from '@/data/questions';
import type { RawScores, NormalizedScores } from './types';

// L-Touch（接触）は質問数が2問しかないため重み1.5を適用（仕様書通り）
export const L_TOUCH_WEIGHT = 1.5;

const BIG5_KEYS: Big5Axis[] = ['E', 'A', 'C', 'N', 'O'];
const MBTI_KEYS: MbtiAxis[] = ['EI', 'SN', 'TF', 'JP'];
const ENNEA_KEYS: EnneaAxis[] = [
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9',
];
const RIASEC_KEYS: RiasecAxis[] = ['R', 'I', 'A', 'S', 'EE', 'Co'];
const VAK_KEYS: VakAxis[] = ['V', 'Au', 'K'];
const ATTACH_KEYS: AttachAxis[] = ['At-Sec', 'At-Av', 'At-Anx', 'At-Fea'];
const LOVE_KEYS: LoveAxis[] = ['L-Time', 'L-Word', 'L-Touch', 'L-Gift', 'L-Act'];
const ENTRE_KEYS: EntreAxis[] = [
  'EnT1', 'EnT2', 'EnT3', 'EnT4', 'EnT5', 'EnT6', 'EnT7', 'EnT8',
];

export function emptyRawScores(): RawScores {
  return {
    big5: { E: 0, A: 0, C: 0, N: 0, O: 0 },
    mbti: { EI: 0, SN: 0, TF: 0, JP: 0 },
    ennea: { E1: 0, E2: 0, E3: 0, E4: 0, E5: 0, E6: 0, E7: 0, E8: 0, E9: 0 },
    riasec: { R: 0, I: 0, A: 0, S: 0, EE: 0, Co: 0 },
    vak: { V: 0, Au: 0, K: 0 },
    attach: { 'At-Sec': 0, 'At-Av': 0, 'At-Anx': 0, 'At-Fea': 0 },
    love: { 'L-Time': 0, 'L-Word': 0, 'L-Touch': 0, 'L-Gift': 0, 'L-Act': 0 },
    entre: { EnT1: 0, EnT2: 0, EnT3: 0, EnT4: 0, EnT5: 0, EnT6: 0, EnT7: 0, EnT8: 0 },
  };
}

// 重み付けを適用（L-Touchのみ1.5倍）
export function applyWeights(raw: RawScores): RawScores {
  return {
    ...raw,
    love: {
      ...raw.love,
      'L-Touch': raw.love['L-Touch'] * L_TOUCH_WEIGHT,
    },
  };
}

// 軸ごとに min-max 正規化して 0-100 にする
// 注意：MBTIは符号付きのため abs して正規化、最終的に正負の方向はtopTypesで判定
function normalizeMap<K extends string>(
  data: Record<K, number>,
  keys: K[]
): Record<K, number> {
  const values = keys.map((k) => data[k]);
  // MBTIは符号有り。範囲は対称的に扱う（[-max..+max] → [0..100]）
  // ここではグループ単位で min/max をとる方式とする：
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const out = {} as Record<K, number>;
  for (const k of keys) {
    if (range === 0) {
      out[k] = 50;
    } else {
      out[k] = Math.round(((data[k] - min) / range) * 100);
    }
  }
  return out;
}

export function normalizeScores(weighted: RawScores): NormalizedScores {
  return {
    big5: normalizeMap(weighted.big5, BIG5_KEYS),
    mbti: normalizeMap(weighted.mbti, MBTI_KEYS),
    ennea: normalizeMap(weighted.ennea, ENNEA_KEYS),
    riasec: normalizeMap(weighted.riasec, RIASEC_KEYS),
    vak: normalizeMap(weighted.vak, VAK_KEYS),
    attach: normalizeMap(weighted.attach, ATTACH_KEYS),
    love: normalizeMap(weighted.love, LOVE_KEYS),
    entre: normalizeMap(weighted.entre, ENTRE_KEYS),
  };
}

export const AXIS_KEYS = {
  big5: BIG5_KEYS,
  mbti: MBTI_KEYS,
  ennea: ENNEA_KEYS,
  riasec: RIASEC_KEYS,
  vak: VAK_KEYS,
  attach: ATTACH_KEYS,
  love: LOVE_KEYS,
  entre: ENTRE_KEYS,
};
