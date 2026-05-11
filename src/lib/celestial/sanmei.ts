// 10. 算命学（自前）— 陰占・陽占
import { Solar } from 'lunar-typescript';
import type { SanmeiResult, ParsedInput } from './types';

// 陽占の主星10種
const STAR_NAMES = [
  '貫索星', '石門星', '鳳閣星', '調舒星', '禄存星',
  '司禄星', '車騎星', '牽牛星', '龍高星', '玉堂星',
];

// 日干 → 陽占東西南北中の主星マッピング（簡略：日柱の干支を5要素で配分）
const STAR_BY_DAY_STEM: Record<string, string> = {
  '甲': '貫索星', '乙': '石門星', '丙': '鳳閣星', '丁': '調舒星',
  '戊': '禄存星', '己': '司禄星', '庚': '車騎星', '辛': '牽牛星',
  '壬': '龍高星', '癸': '玉堂星',
};

// 陽占の方位別星算出（簡略）
const POSITION_OFFSETS = {
  east: 0,    // 配偶者
  south: 1,   // 子供
  center: 2,  // 自分
  west: 3,    // 兄弟
  north: 4,   // 親
};

export function computeSanmei(p: ParsedInput): SanmeiResult {
  const solar = Solar.fromYmdHms(p.year, p.month, p.day, 12, 0, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const yearGanzhi = eightChar.getYear();
  const monthGanzhi = eightChar.getMonth();
  const dayGanzhi = eightChar.getDay();

  const dayStem = dayGanzhi[0]; // 日干
  const baseStarIndex = STAR_NAMES.indexOf(STAR_BY_DAY_STEM[dayStem] ?? STAR_NAMES[0]);

  function shift(n: number): string {
    return STAR_NAMES[(baseStarIndex + n) % 10];
  }

  return {
    yinSei: {
      year: yearGanzhi,
      month: monthGanzhi,
      day: dayGanzhi,
    },
    yangSei: {
      east: shift(POSITION_OFFSETS.east),
      south: shift(POSITION_OFFSETS.south),
      center: shift(POSITION_OFFSETS.center),
      west: shift(POSITION_OFFSETS.west),
      north: shift(POSITION_OFFSETS.north),
    },
    mainStar: STAR_BY_DAY_STEM[dayStem] ?? '',
  };
}
