// 2. 紫微斗数（iztro）
// 仕様書罠：iztro月柱は旧暦月基準で四柱推命と食い違う。直接同期させない
import { astro } from 'iztro';
import type { ZiweiResult, ParsedInput } from './types';
import { getZiweiTimeIndex } from './_util';

export function computeZiwei(p: ParsedInput): ZiweiResult {
  const dateStr = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  const timeIndex = p.hasTime ? getZiweiTimeIndex(p.hour) : 6; // 時刻不明は午時(11-13)で仮算出
  const genderJa = p.gender === 'female' ? '女' : '男';

  const astrolabe = astro.bySolar(dateStr, timeIndex, genderJa, true, 'ja-JP') as unknown as {
    soul: string;
    body: string;
    fiveElementsClass: string;
    earthlyBranchOfSoulPalace: string;
    earthlyBranchOfBodyPalace: string;
    palaces: Array<{
      name: string;
      isBodyPalace: boolean;
      isOriginalPalace: boolean;
      heavenlyStem: string;
      earthlyBranch: string;
      majorStars: Array<{ name: string; brightness?: string; mutagen?: string }>;
      minorStars: Array<{ name: string }>;
    }>;
  };

  return {
    soul: astrolabe.soul,
    body: astrolabe.body,
    fiveElementsClass: astrolabe.fiveElementsClass,
    earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace,
    palaces: astrolabe.palaces.map((pal) => ({
      name: pal.name,
      isBodyPalace: !!pal.isBodyPalace,
      isOriginalPalace: !!pal.isOriginalPalace,
      heavenlyStem: pal.heavenlyStem,
      earthlyBranch: pal.earthlyBranch,
      majorStars: pal.majorStars.map((s) => ({
        name: s.name,
        brightness: s.brightness,
        mutagen: s.mutagen,
      })),
      minorStars: pal.minorStars.map((s) => s.name),
    })),
    notice: p.hasTime ? undefined : '時刻不明のため命宮位置は概算です',
  };
}
