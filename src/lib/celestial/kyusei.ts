// 3. 九星気学（自前）— 本命星・月命星・傾斜
import type { KyuseiResult, ParsedInput } from './types';
import { digitSum } from './_util';

const KYUSEI_NAMES = [
  '', '一白水星', '二黒土星', '三碧木星', '四緑木星', '五黄土星',
  '六白金星', '七赤金星', '八白土星', '九紫火星',
] as const;

const KYUSEI_ELEMENTS = [
  '', '水', '土', '木', '木', '土', '金', '金', '土', '火',
] as const;

// 月別月命星テーブル（節入り考慮、簡易）
const MONTH_TABLE: Record<string, number[]> = {
  A: [8, 7, 6, 5, 4, 3, 2, 1, 9, 8, 7, 6], // 一白・四緑・七赤
  B: [2, 1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 9], // 二黒・五黄・八白
  C: [5, 4, 3, 2, 1, 9, 8, 7, 6, 5, 4, 3], // 三碧・六白・九紫
};

function getHonmeiSei(year: number, month: number, day: number): number {
  // 立春は概ね2/4。1月〜2/3生まれは前年扱い
  const adjustedYear = (month < 2 || (month === 2 && day < 4)) ? year - 1 : year;
  let s = digitSum(adjustedYear);
  while (s > 9) s = digitSum(s);
  let honmei = 11 - s;
  if (honmei <= 0) honmei += 9;
  if (honmei > 9) honmei -= 9;
  return honmei;
}

function getGetsumeiSei(honmei: number, month: number, day: number): number {
  let group: 'A' | 'B' | 'C' = 'A';
  if ([2, 5, 8].includes(honmei)) group = 'B';
  else if ([3, 6, 9].includes(honmei)) group = 'C';
  // 節入り考慮（簡易：5日以前は前月扱い）
  let m = month;
  if (day < 5) m -= 1;
  if (m < 1) m += 12;
  return MONTH_TABLE[group][m - 1];
}

// 傾斜宮：月命星が後天定位盤上のどの位置にあるかで決定
// 簡易版：月命星に対応する宮（艮宮=8, 離宮=9 等）
const KEISHA_NAMES = [
  '', '坎宮傾斜', '坤宮傾斜', '震宮傾斜', '巽宮傾斜', '中宮傾斜',
  '乾宮傾斜', '兌宮傾斜', '艮宮傾斜', '離宮傾斜',
] as const;

export function computeKyusei(p: ParsedInput): KyuseiResult {
  const honmei = getHonmeiSei(p.year, p.month, p.day);
  const getsumei = getGetsumeiSei(honmei, p.month, p.day);
  const keisha = honmei === getsumei ? '後宮命（自宅傾斜）' : KEISHA_NAMES[getsumei];

  return {
    honmeiSei: {
      number: honmei,
      name: KYUSEI_NAMES[honmei],
      element: KYUSEI_ELEMENTS[honmei],
    },
    getsumeiSei: {
      number: getsumei,
      name: KYUSEI_NAMES[getsumei],
      element: KYUSEI_ELEMENTS[getsumei],
    },
    keishaKyu: keisha,
  };
}
