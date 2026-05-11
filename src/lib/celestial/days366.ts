// 12. 366日タイプ（独自テンプレ）
// 数秘＋星座＋誕生日数の組合せでタイプ生成
import type { Days366Result, ParsedInput } from './types';
import { reduceNumber } from './_util';

const KEYWORD_BANK = [
  '黎明の探検家', '静謐の知性', '熱情の創造者', '深淵の観察者', '結晶の意志',
  '流転の語り部', '紡ぎ手の慈愛', '稲光の革命', '深紅の冒険', '黄昏の調停者',
  '宙の遊行者', '篤志の建築家', '密林の隠者', '蒼海の解放者', '紫水晶の祈祷',
];

function dayOfYear(year: number, month: number, day: number): number {
  const start = new Date(Date.UTC(year, 0, 1));
  const target = new Date(Date.UTC(year, month - 1, day));
  return Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function computeDays366(p: ParsedInput): Days366Result {
  const dayIndex = dayOfYear(p.year, p.month, p.day);
  // 366を15バンクに分割（24-25日ごと）→ 各バンクから1キーワード
  const bankIndex = Math.min(14, Math.floor((dayIndex - 1) / 25));
  const keyword = KEYWORD_BANK[bankIndex];

  // タイプ名 = 数秘ライフパス + キーワード
  const lifePath = reduceNumber(reduceNumber(p.year) + reduceNumber(p.month) + reduceNumber(p.day));
  const typeName = `第${dayIndex}日：${keyword}（数秘${lifePath}型）`;

  return {
    dayIndex,
    typeName,
    keyword,
  };
}
