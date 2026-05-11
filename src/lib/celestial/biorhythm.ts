// 16. バイオリズム年間カレンダー（PSI周期 + 四柱の流年）
// 12ヶ月先までの運気カレンダー
import type { BiorhythmResult, BiorhythmMonth, ParsedInput } from './types';

// PSI周期：身体23日、感情28日、知性33日
const PHYSICAL_CYCLE = 23;
const EMOTIONAL_CYCLE = 28;
const INTELLECTUAL_CYCLE = 33;

function daysSinceBirth(birthY: number, birthM: number, birthD: number, targetY: number, targetM: number, targetD: number): number {
  const b = new Date(Date.UTC(birthY, birthM - 1, birthD));
  const t = new Date(Date.UTC(targetY, targetM - 1, targetD));
  return Math.floor((t.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function biorhythmValue(days: number, cycle: number): number {
  return Math.sin((2 * Math.PI * days) / cycle);
}

// 月平均から運勢ラベルを判定
function fortuneFromAvg(avg: number): BiorhythmMonth['fortune'] {
  if (avg > 0.6) return '大吉';
  if (avg > 0.3) return '吉';
  if (avg > 0) return '中吉';
  if (avg > -0.3) return '小凶';
  return '凶';
}

const THEME_BY_FORTUNE: Record<BiorhythmMonth['fortune'], string> = {
  '大吉': '攻めの月：種を蒔き拡げる',
  '吉': '前進の月：着実に積み上げる',
  '中吉': '調整の月：見直して整える',
  '小凶': '内省の月：静観して充電する',
  '凶': '休息の月：守りに徹する',
};

export function computeBiorhythm(p: ParsedInput): BiorhythmResult {
  // 今日を起点とする12ヶ月のカレンダー
  const today = new Date();
  const months: BiorhythmMonth[] = [];

  for (let i = 0; i < 12; i++) {
    const target = new Date(today.getFullYear(), today.getMonth() + i, 15); // 各月15日基準
    const ty = target.getFullYear();
    const tm = target.getMonth() + 1;
    const td = 15;
    const days = daysSinceBirth(p.year, p.month, p.day, ty, tm, td);

    const physical = biorhythmValue(days, PHYSICAL_CYCLE);
    const emotional = biorhythmValue(days, EMOTIONAL_CYCLE);
    const intellectual = biorhythmValue(days, INTELLECTUAL_CYCLE);
    const avg = (physical + emotional + intellectual) / 3;
    const fortune = fortuneFromAvg(avg);

    months.push({
      yearMonth: `${ty}-${String(tm).padStart(2, '0')}`,
      physical: Math.round(physical * 100) / 100,
      emotional: Math.round(emotional * 100) / 100,
      intellectual: Math.round(intellectual * 100) / 100,
      fortune,
      theme: THEME_BY_FORTUNE[fortune],
    });
  }

  return { months };
}
