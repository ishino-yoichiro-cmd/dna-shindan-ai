// 入力パースと共通変換
import type { CelestialInput, ParsedInput } from './types';

export function parseInput(input: CelestialInput): ParsedInput {
  const [yStr, mStr, dStr] = input.birthDate.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  let hour = 12;
  let minute = 0;
  const hasTime = !!input.birthTime;
  if (input.birthTime) {
    const [hStr, miStr] = input.birthTime.split(':');
    hour = parseInt(hStr, 10);
    minute = parseInt(miStr, 10);
  }

  const hasPlace = !!input.birthPlace;
  const latitude = input.birthPlace?.latitude ?? 35.6762;   // 東京デフォルト
  const longitude = input.birthPlace?.longitude ?? 139.6503;
  const timezone = input.birthPlace?.timezone ?? 'Asia/Tokyo';

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new Error(`Invalid birthDate: ${input.birthDate}`);
  }

  return {
    year, month, day, hour, minute,
    hasTime, hasPlace,
    latitude, longitude, timezone,
    fullName: input.fullName,
    gender: input.gender ?? 'male',
  };
}

// 中文簡体字→日本語の十神マッピング
export const SHISHEN_MAP: Record<string, string> = {
  '比肩': '比肩',
  '劫财': '劫財',
  '食神': '食神',
  '伤官': '傷官',
  '偏财': '偏財',
  '正财': '正財',
  '七杀': '七殺',
  '正官': '正官',
  '偏印': '偏印',
  '正印': '正印',
  '日主': '日主',
};

// 納音60種の中文→日本語マッピング（主要なもの）
export const NAYIN_MAP: Record<string, string> = {
  '海中金': '海中金',
  '炉中火': '炉中火',
  '大林木': '大林木',
  '路旁土': '路傍土',
  '剑锋金': '剣鋒金',
  '山头火': '山頭火',
  '涧下水': '澗下水',
  '城头土': '城頭土',
  '白蜡金': '白蝋金',
  '杨柳木': '楊柳木',
  '泉中水': '泉中水',
  '屋上土': '屋上土',
  '霹雳火': '霹靂火',
  '松柏木': '松柏木',
  '长流水': '長流水',
  '砂中金': '砂中金',
  '山下火': '山下火',
  '平地木': '平地木',
  '壁上土': '壁上土',
  '金箔金': '金箔金',
  '覆灯火': '覆燈火',
  '天河水': '天河水',
  '大驿土': '大駅土',
  '钗钏金': '釵釧金',
  '桑柘木': '桑柘木',
  '大溪水': '大溪水',
  '砂中土': '砂中土',
  '天上火': '天上火',
  '石榴木': '石榴木',
  '大海水': '大海水',
};

export function mapShiShen(value: string | null | undefined): string {
  if (!value) return '';
  return SHISHEN_MAP[value] ?? value;
}

export function mapNaYin(value: string | null | undefined): string {
  if (!value) return '';
  return NAYIN_MAP[value] ?? value;
}

// 数秘還元（マスター数保持オプション）
export function reduceNumber(n: number, keepMaster = true): number {
  while (n > 9) {
    if (keepMaster && (n === 11 || n === 22 || n === 33)) return n;
    n = String(n).split('').reduce((s, d) => s + parseInt(d, 10), 0);
  }
  return n;
}

// 数字の各桁の和
export function digitSum(n: number): number {
  let s = 0;
  let x = Math.abs(n);
  while (x > 0) { s += x % 10; x = Math.floor(x / 10); }
  return s;
}

// 紫微斗数のtimeIndex変換 (時刻 → 0-11)
// 0=23:00-01:00（子時）, 1=01:00-03:00（丑時）, ..., 7=13:00-15:00（未時）
export function getZiweiTimeIndex(hour: number): number {
  if (hour === 23 || hour === 0) return 0; // 子
  return Math.floor((hour + 1) / 2);
}
