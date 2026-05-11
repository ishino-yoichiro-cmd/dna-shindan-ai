// 6. 数秘術（自前）— ピタゴラス式・ライフパス・誕生日数・運命数
import type { NumerologyResult, ParsedInput } from './types';
import { reduceNumber } from './_util';

const MEANING: Record<number, string> = {
  1: 'リーダー・先駆者',
  2: '協調・パートナー',
  3: '創造・表現',
  4: '安定・実務',
  5: '自由・変化',
  6: '愛・調和',
  7: '探究・神秘',
  8: '権威・成功',
  9: '完成・博愛',
  11: 'マスター数：直感・霊性',
  22: 'マスター数：大建設者',
  33: 'マスター数：無条件の愛',
};

export function computeNumerology(p: ParsedInput): NumerologyResult {
  // ライフパス計算：生年月日（YYYYMMDD形式）の全桁を合算してからマスター判定する。
  // 例: 1981-01-11 → '19810111' → 1+9+8+1+0+1+1+1=22 → マスターナンバー22
  const dateStr =
    String(p.year) + String(p.month).padStart(2, '0') + String(p.day).padStart(2, '0');
  const digitSum = dateStr.split('').reduce((s, c) => s + parseInt(c, 10), 0);
  const lifePath = reduceNumber(digitSum);
  const birthDay = reduceNumber(p.day);
  const destiny = reduceNumber(p.month + p.day);
  const isMaster = [11, 22, 33].includes(lifePath);

  return {
    lifePath,
    birthDay,
    destiny,
    isMaster,
    meaning: MEANING[lifePath] ?? '',
  };
}
