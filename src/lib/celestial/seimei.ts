// 9. 姓名判断（seimei + kanji.js + 康熙画数辞書）
import { divide } from 'seimei';
import Kanji from 'kanji.js';
import type { SeimeiResult, ParsedInput } from './types';
import kokiDict from '@/data/kanji-koki.json';

type KokiEntry = { stroke: number; old: string };
const KOKI_DICT = kokiDict as unknown as Record<string, KokiEntry | { description?: string; note?: string; schema?: object }>;

function getStrokeForChar(c: string): { stroke: number; isOldForm: boolean } {
  // 1. 康熙画数辞書を優先
  const entry = KOKI_DICT[c];
  if (entry && typeof entry === 'object' && 'stroke' in entry && typeof entry.stroke === 'number' && entry.stroke > 0) {
    return { stroke: entry.stroke, isOldForm: !!entry.old };
  }
  // 2. kanji.js にフォールバック
  try {
    const detail = Kanji.getDetails(c);
    return { stroke: detail?.stroke_count ?? 0, isOldForm: false };
  } catch {
    return { stroke: 0, isOldForm: false };
  }
}

// 三才配置：天格・人格・地格の五行から配置を判定
function strokeToElement(n: number): string {
  const last = n % 10;
  if (last === 1 || last === 2) return '木';
  if (last === 3 || last === 4) return '火';
  if (last === 5 || last === 6) return '土';
  if (last === 7 || last === 8) return '金';
  return '水';
}

// 三才配置の調和判定（簡略：相生なら吉、相剋なら凶）
const SHENG_RELATIONS: Record<string, string> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

function checkSansaiHarmony(ten: string, jin: string, chi: string): string {
  // 相生（順行）: ten→jin→chi
  if (SHENG_RELATIONS[ten] === jin && SHENG_RELATIONS[jin] === chi) return '大吉（相生連環）';
  if (SHENG_RELATIONS[jin] === chi || SHENG_RELATIONS[ten] === jin) return '吉（部分相生）';
  if (ten === jin && jin === chi) return '中（同行）';
  return '注意（相剋含む）';
}

export function computeSeimei(p: ParsedInput): SeimeiResult {
  const fullName = p.fullName?.trim() ?? '';
  if (!fullName) {
    return {
      lastName: '', firstName: '',
      strokeCounts: [],
      gokaku: { tenkaku: 0, jinkaku: 0, chikaku: 0, sotenkaku: 0, gaikaku: 0 },
      sansaiHaichi: { ten: '', jin: '', chi: '', harmony: '' },
      notice: '氏名が未入力のため算出できません',
    };
  }

  const divided = divide(fullName);
  const lastName = divided?.lastName ?? '';
  const firstName = divided?.firstName ?? '';

  const allChars = [...fullName].filter((c) => c.trim() !== '');
  const strokeCounts = allChars.map((c) => {
    const { stroke, isOldForm } = getStrokeForChar(c);
    return { char: c, stroke, isOldForm };
  });

  if (!lastName || !firstName) {
    return {
      lastName, firstName,
      strokeCounts,
      gokaku: { tenkaku: 0, jinkaku: 0, chikaku: 0, sotenkaku: 0, gaikaku: 0 },
      sansaiHaichi: { ten: '', jin: '', chi: '', harmony: '' },
      notice: '氏名分離に失敗（姓または名が不明）',
    };
  }

  const lastChars = [...lastName];
  const firstChars = [...firstName];
  const lastStrokes = lastChars.map((c) => getStrokeForChar(c).stroke);
  const firstStrokes = firstChars.map((c) => getStrokeForChar(c).stroke);

  const tenkaku = lastStrokes.reduce((a, b) => a + b, 0);
  const jinkaku = (lastStrokes[lastStrokes.length - 1] ?? 0) + (firstStrokes[0] ?? 0);
  const chikaku = firstStrokes.reduce((a, b) => a + b, 0);
  const sotenkaku = tenkaku + chikaku;
  const gaikaku = sotenkaku - jinkaku;

  const ten = strokeToElement(tenkaku);
  const jin = strokeToElement(jinkaku);
  const chi = strokeToElement(chikaku);

  return {
    lastName, firstName,
    strokeCounts,
    gokaku: { tenkaku, jinkaku, chikaku, sotenkaku, gaikaku },
    sansaiHaichi: { ten, jin, chi, harmony: checkSansaiHarmony(ten, jin, chi) },
  };
}
