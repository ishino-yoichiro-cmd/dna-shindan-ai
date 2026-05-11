// 5. マヤ暦（@drewsonne/maya-dates + 自前20紋章×13音マップ）
// maya-dates は exports field で require のみ提供されており、
// Next.js 16 webpack でデフォルト import が解決できないため lib/* 経由でimport
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - 直接サブパスimport
import { LongCount } from '@drewsonne/maya-dates/lib/index.js';
import type { MayaResult, ParsedInput } from './types';

// 20紋章（Tzolkin名 → 日本語紋章名）
const GLYPH_MAP: Record<string, string> = {
  'Imix': '赤い龍',
  'Ik': '白い風',
  'Akbal': '青い夜',
  'Kan': '黄色い種',
  'Chikchan': '赤い蛇',
  'Kimi': '白い世界の橋渡し',
  'Manik': '青い手',
  'Lamat': '黄色い星',
  'Muluk': '赤い月',
  'Ok': '白い犬',
  'Chuwen': '青い猿',
  'Eb': '黄色い人',
  'Ben': '赤い空歩く人',
  'Ix': '白い魔法使い',
  'Men': '青い鷲',
  'Kib': '黄色い戦士',
  'Kaban': '赤い地球',
  'Etznab': '白い鏡',
  'Kawak': '青い嵐',
  'Ahaw': '黄色い太陽',
};

const GLYPH_ORDER = [
  'Imix', 'Ik', 'Akbal', 'Kan', 'Chikchan', 'Kimi', 'Manik', 'Lamat',
  'Muluk', 'Ok', 'Chuwen', 'Eb', 'Ben', 'Ix', 'Men', 'Kib',
  'Kaban', 'Etznab', 'Kawak', 'Ahaw',
];

export function computeMaya(p: ParsedInput): MayaResult {
  const dateStr = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  const lc = LongCount.fromGregorian(dateStr);
  const fullDate = lc.buildFullDate();

  type CrShape = {
    cr?: {
      tzolkin?: { coeff?: { toString: () => string } | number; name?: { toString: () => string } | string };
      haab?: { coeff?: { toString: () => string } | number; month?: { toString: () => string } | string };
    };
  };
  const cr = (fullDate as unknown as CrShape).cr;

  const tzCoeffRaw = cr?.tzolkin?.coeff;
  const tzNameRaw = cr?.tzolkin?.name;
  const tzCoeff = typeof tzCoeffRaw === 'number'
    ? tzCoeffRaw
    : parseInt(tzCoeffRaw?.toString() ?? '1', 10);
  const tzName = typeof tzNameRaw === 'string'
    ? tzNameRaw
    : tzNameRaw?.toString() ?? '';

  const haCoeffRaw = cr?.haab?.coeff;
  const haNameRaw = cr?.haab?.month;
  const haCoeff = typeof haCoeffRaw === 'number'
    ? haCoeffRaw
    : parseInt(haCoeffRaw?.toString() ?? '0', 10);
  const haName = typeof haNameRaw === 'string'
    ? haNameRaw
    : haNameRaw?.toString() ?? '';

  // KIN番号 = 紋章番号(1-20) + (音-1)*20 で算出（マヤ暦診断式）
  const glyphIndex = GLYPH_ORDER.indexOf(tzName);
  const glyphNumber = glyphIndex >= 0 ? glyphIndex + 1 : 1;
  const tone = tzCoeff;
  const kin = ((tone - 1) * 20 + glyphNumber - 1) % 260 + 1;

  return {
    longCount: lc.toString(),
    tzolkin: { coeff: tzCoeff, name: tzName },
    haab: { coeff: haCoeff, month: haName },
    kin,
    glyph: GLYPH_MAP[tzName] ?? tzName,
    galacticTone: tone,
  };
}
