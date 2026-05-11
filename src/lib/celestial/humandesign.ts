// 8. ヒューマンデザイン風（独自命名）— 64ゲート×9センター
// 試作版：太陽の黄経差から太陽ゲート/地球ゲートを算出
// 注：本実装はSwiss Ephemerisを使わず、circular-natal-horoscope-jsの太陽位置から計算する近似版
import type { HumanDesignResult, ParsedInput } from './types';
import { createRequire } from 'module';
const cjsRequire = createRequire(import.meta.url);

// 64ゲート名（独自命名でWealth Dynamics/HD用語回避）
// 注：本数値は将来の解釈レポート生成で参照されるため保持
export const GATE_NAMES: Record<number, string> = {
  1: '創造の源', 2: '受容の杯', 3: '混沌の秩序', 4: '答えの探求',
  5: '一定のリズム', 6: '摩擦の解像', 7: '集団の指揮', 8: '個性の貢献',
  9: '焦点の絞り', 10: '自己の振る舞い', 11: '伝達の流転', 12: '慎重なる声',
  13: '記憶の語り部', 14: '富の力', 15: '極端な愛', 16: '熱狂の技巧',
  17: '意見の鋭さ', 18: '修正の眼', 19: '感受の橋', 20: '今ここ',
  21: '統制の支配', 22: '優美の社交', 23: '同化の革新', 24: '再帰の啓示',
  25: '無垢の愛', 26: '誇張の説得', 27: '養育の徳', 28: '冒険の意志',
  29: '従事の決心', 30: '感情の燃焼', 31: '影響の指導', 32: '変化の継承',
  33: '撤退の記録', 34: '万能の力', 35: '体験の進歩', 36: '感情危機',
  37: '友情の家族', 38: '反抗の戦士', 39: '挑発の刺激', 40: '解放の供給',
  41: '空想の発火', 42: '増進の閉幕', 43: '内なる悟り', 44: '警戒の機転',
  45: '集合の王', 46: '肉体の歓喜', 47: '抑制の閃き', 48: '深さの井戸',
  49: '原理の革命', 50: '価値の維持', 51: '衝撃の覚醒', 52: '不動の山',
  53: '始動の発展', 54: '野望の進化', 55: '精神の自由', 56: '探求の語り',
  57: '直感の鋭敏', 58: '生命の悦び', 59: '親密の戦略', 60: '受容の制限',
  61: '神秘の真理', 62: '詳細の表現', 63: '懐疑の論理', 64: '混乱の通過',
};

// 9センター（独自命名）
const CENTER_NAMES = [
  '頭頂チャクラ', '思考センター', '喉センター', 'G(自己)センター',
  '心臓センター', '太陽神経叢', '仙骨センター', '脾臓センター', 'ルートセンター',
];

// 16ゲート→9センター対応表（簡略）
const GATE_TO_CENTER: Record<number, string> = {
  64: '頭頂チャクラ', 61: '頭頂チャクラ', 63: '頭頂チャクラ',
  47: '思考センター', 24: '思考センター', 4: '思考センター', 17: '思考センター', 43: '思考センター', 11: '思考センター',
  62: '喉センター', 23: '喉センター', 56: '喉センター', 35: '喉センター', 12: '喉センター', 45: '喉センター',
  33: '喉センター', 8: '喉センター', 31: '喉センター', 7: '喉センター', 1: '喉センター', 13: '喉センター',
  10: 'G(自己)センター', 25: 'G(自己)センター', 46: 'G(自己)センター', 2: 'G(自己)センター', 15: 'G(自己)センター',
  21: '心臓センター', 40: '心臓センター', 26: '心臓センター', 51: '心臓センター',
  6: '太陽神経叢', 37: '太陽神経叢', 22: '太陽神経叢', 36: '太陽神経叢', 30: '太陽神経叢', 55: '太陽神経叢', 49: '太陽神経叢',
  34: '仙骨センター', 5: '仙骨センター', 14: '仙骨センター', 29: '仙骨センター', 59: '仙骨センター', 9: '仙骨センター',
  3: '仙骨センター', 42: '仙骨センター', 27: '仙骨センター',
  48: '脾臓センター', 57: '脾臓センター', 44: '脾臓センター', 50: '脾臓センター', 32: '脾臓センター', 28: '脾臓センター', 18: '脾臓センター',
  53: 'ルートセンター', 60: 'ルートセンター', 52: 'ルートセンター', 19: 'ルートセンター', 39: 'ルートセンター', 41: 'ルートセンター', 58: 'ルートセンター', 38: 'ルートセンター', 54: 'ルートセンター',
};

// 黄経 → ゲート番号（HD式：黄道360°を64ゲートで分割し、Aries 0° から開始）
// HDではゲート順は「41-19-13...」など独自順序だが、ここでは試作のため Aries 0° スタートの順番で固定
function eclipticToGate(degrees: number): number {
  const norm = ((degrees % 360) + 360) % 360;
  const gate = Math.floor(norm / (360 / 64)) + 1;
  return Math.min(64, Math.max(1, gate));
}

export function computeHumanDesign(p: ParsedInput): HumanDesignResult {
  if (!p.hasTime || !p.hasPlace) {
    return {
      type: '不明',
      strategy: '時刻または出生地が必要',
      authority: '不明',
      profile: '不明',
      sunGate: 0,
      earthGate: 0,
      centers: CENTER_NAMES.map((name) => ({ name, defined: false })),
      notice: '時刻または出生地が不明のため、ヒューマンデザイン風の算出はできません',
    };
  }

  const lib = cjsRequire('circular-natal-horoscope-js') as {
    Origin: new (a: object) => unknown;
    Horoscope: new (a: object) => unknown;
  };
  const origin = new lib.Origin({
    year: p.year, month: p.month - 1, date: p.day,
    hour: p.hour, minute: p.minute,
    latitude: p.latitude, longitude: p.longitude,
  });
  const horoscope = new lib.Horoscope({
    origin, houseSystem: 'placidus', zodiac: 'tropical',
  }) as { CelestialBodies?: { all?: Array<{ key: string; ChartPosition?: { Ecliptic?: { DecimalDegrees?: number } } }> } };

  const sun = horoscope.CelestialBodies?.all?.find((b) => b.key === 'sun');
  const sunDeg = sun?.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0;
  const earthDeg = (sunDeg + 180) % 360; // 地球は太陽の対極

  const sunGate = eclipticToGate(sunDeg);
  const earthGate = eclipticToGate(earthDeg);

  // 起動センター（試作）：太陽・地球ゲートが属するセンターをdefined扱い
  const definedCenters = new Set<string>();
  const sunCenter = GATE_TO_CENTER[sunGate];
  const earthCenter = GATE_TO_CENTER[earthGate];
  if (sunCenter) definedCenters.add(sunCenter);
  if (earthCenter) definedCenters.add(earthCenter);

  // タイプ判定（試作）：仙骨センターがdefinedならジェネレーター系、それ以外はマニフェスター系
  const sacralDefined = definedCenters.has('仙骨センター');
  const type = sacralDefined ? 'ジェネレーター（応答する人）' : 'マニフェスター風（始動する人）';
  const strategy = sacralDefined ? '応答に従う' : '伝えてから始める';
  const authority = '感情的明晰さ（暫定）';

  // プロファイル（試作）：太陽ゲートのline + 地球ゲートのline
  const sunLine = Math.floor(((sunDeg % (360 / 64)) / (360 / 64)) * 6) + 1;
  const earthLine = Math.floor(((earthDeg % (360 / 64)) / (360 / 64)) * 6) + 1;
  const profile = `${sunLine}/${earthLine}`;

  return {
    type,
    strategy,
    authority,
    profile,
    sunGate,
    earthGate,
    centers: CENTER_NAMES.map((name) => ({ name, defined: definedCenters.has(name) })),
    notice: '試作版：HD公式アルゴリズムではなく簡易計算による近似値',
  };
}
