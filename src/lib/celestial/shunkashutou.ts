// 13. 春夏秋冬理論独自命名
// 60年周期を4分割（春15年・夏15年・秋15年・冬15年）
import type { ShunkashutouResult, ParsedInput } from './types';

const THEME_NAMES: Record<string, string[]> = {
  春: ['萌芽の光', '若葉の翔', '花開の風', '青葉の鼓動', '満開の歌'],
  夏: ['炎熱の決断', '盛夏の躍動', '烈日の挑戦', '緑陰の創造', '蝉時雨の収穫'],
  秋: ['黄金の刈り取り', '紅葉の沈思', '実りの分配', '落葉の手放し', '紫禁の継承'],
  冬: ['深雪の籠り', '凍土の鍛錬', '北風の見極め', '凛冬の沈黙', '雪解けの胎動'],
};

export function computeShunkashutou(p: ParsedInput): ShunkashutouResult {
  // 60年周期内のサイクル年（生年からの経過 mod 60）
  // 1900年を冬の終わりと仮定
  const cycleYear = ((p.year - 1900) % 60 + 60) % 60;

  let season: '春' | '夏' | '秋' | '冬';
  let phase: string;
  if (cycleYear < 15) {
    season = '春';
    phase = `春${cycleYear + 1}年目`;
  } else if (cycleYear < 30) {
    season = '夏';
    phase = `夏${cycleYear - 14}年目`;
  } else if (cycleYear < 45) {
    season = '秋';
    phase = `秋${cycleYear - 29}年目`;
  } else {
    season = '冬';
    phase = `冬${cycleYear - 44}年目`;
  }

  const phaseIndex = cycleYear % 15;
  const subIndex = Math.floor(phaseIndex / 3); // 0-4
  const themeName = THEME_NAMES[season][subIndex];

  return {
    cycleYear,
    season,
    phase,
    themeName,
  };
}
