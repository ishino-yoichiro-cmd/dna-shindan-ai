// 11. 動物キャラ独自命名（60キャラ）
// 個性心理學の計算式 (mod 60) を採用、命名は完全独自
import type { DoubutsuResult, ParsedInput } from './types';

// 12動物 × 5バリアント（色） = 60キャラ
const BASE_ANIMALS = [
  '狼', '小鹿', '猿', '牡羊', '黒豹', '虎', '狸', '子守熊', '象', '羊', 'ペガサス', '獅子',
];

const VARIANTS = ['朱', '蒼', '翠', '黄', '玄'];
// 各バリアントに紐づく色名
const COLOR_NAMES = ['紅', '碧', '緑', '金', '黒'];

// 1900-01-01 を起点とする日数 mod 60 で個性番号を算出（個性心理學の式に近い）
function daysSinceEpoch(year: number, month: number, day: number): number {
  const epoch = new Date(Date.UTC(1900, 0, 1));
  const target = new Date(Date.UTC(year, month - 1, day));
  return Math.floor((target.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeDoubutsu(p: ParsedInput): DoubutsuResult {
  const days = daysSinceEpoch(p.year, p.month, p.day);
  // 個性心理學式：(年・月・日から算出した特定値) mod 60
  // 簡略式：days mod 60 + 1 で 1〜60
  const number = (days % 60 + 60) % 60 + 1;

  // 60キャラを 12 × 5 で展開
  const animalIndex = (number - 1) % 12;
  const variantIndex = Math.floor((number - 1) / 12) % 5;

  const baseAnimal = BASE_ANIMALS[animalIndex];
  const variant = VARIANTS[variantIndex];
  const color = COLOR_NAMES[variantIndex];

  return {
    number,
    baseAnimal,
    variant,
    fullName: `${variant}の${baseAnimal}`,
    color,
  };
}
