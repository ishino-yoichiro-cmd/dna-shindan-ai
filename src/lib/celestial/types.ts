// 命術16診断の統合型定義
// verify/celestial-types.ts を本実装向けに拡張

export type CelestialInput = {
  fullName?: string;
  birthDate: string;          // YYYY-MM-DD
  birthTime?: string;         // HH:MM
  birthPlace?: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  gender?: 'male' | 'female';
};

// 内部展開用
export type ParsedInput = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  hasTime: boolean;
  hasPlace: boolean;
  latitude: number;
  longitude: number;
  timezone: string;
  fullName?: string;
  gender: 'male' | 'female';
};

// 1. 四柱推命
export type ShichuResult = {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  timePillar: string | null;
  wuXing: { year: string; month: string; day: string; time: string | null };
  shiShen: { year: string; month: string; day: string; time: string | null };
  naYin: { year: string; month: string; day: string; time: string | null };
  jieQi: string;
  shengXiao: string;
  lunarDate: string;
};

// 2. 紫微斗数
export type ZiweiPalace = {
  name: string;
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: { name: string; brightness?: string; mutagen?: string }[];
  minorStars: string[];
};

export type ZiweiResult = {
  soul: string;
  body: string;
  fiveElementsClass: string;
  earthlyBranchOfSoulPalace: string;
  earthlyBranchOfBodyPalace: string;
  palaces: ZiweiPalace[];
  notice?: string;
};

// 3. 九星気学
export type KyuseiResult = {
  honmeiSei: { number: number; name: string; element: string };
  getsumeiSei: { number: number; name: string; element: string };
  keishaKyu: string;
};

// 4. 宿曜
export type ShukuyoResult = {
  xiu27: string;
  xiuLuck: string;
  zheng: string;
  group: string;
};

// 5. マヤ暦
export type MayaResult = {
  longCount: string;
  tzolkin: { coeff: number; name: string };
  haab: { coeff: number; month: string };
  kin: number;
  glyph: string;
  galacticTone: number;
};

// 6. 数秘
export type NumerologyResult = {
  lifePath: number;
  birthDay: number;
  destiny: number;
  isMaster: boolean;
  meaning: string;
};

// 7. 西洋占星術
export type WesternAstroBody = {
  key: string;
  label: string;
  sign: string;
  house: number | null;
  degree: number;
  isRetrograde: boolean;
};

export type WesternAstroResult = {
  sun: { sign: string; degree: number; house: number | null };
  moon: { sign: string; degree: number; house: number | null };
  ascendant: { sign: string; degree: number } | null;
  midheaven: { sign: string; degree: number } | null;
  planets: WesternAstroBody[];
  houses: { number: number; sign: string; degree: number }[] | null;
  notice?: string;
};

// 8. ヒューマンデザイン風（独自命名）
export type HumanDesignResult = {
  type: string;
  strategy: string;
  authority: string;
  profile: string;
  sunGate: number;
  earthGate: number;
  centers: { name: string; defined: boolean }[];
  notice?: string;
};

// 9. 姓名判断
export type SeimeiResult = {
  lastName: string;
  firstName: string;
  strokeCounts: { char: string; stroke: number; isOldForm: boolean }[];
  gokaku: {
    tenkaku: number;
    jinkaku: number;
    chikaku: number;
    sotenkaku: number;
    gaikaku: number;
  };
  sansaiHaichi: { ten: string; jin: string; chi: string; harmony: string };
  notice?: string;
};

// 10. 算命学
export type SanmeiResult = {
  yinSei: { year: string; month: string; day: string };
  yangSei: { east: string; south: string; center: string; west: string; north: string };
  mainStar: string;
};

// 11. 動物キャラ独自命名（60キャラ）
export type DoubutsuResult = {
  number: number;
  baseAnimal: string;
  variant: string;
  fullName: string;
  color: string;
};

// 12. 366日タイプ
export type Days366Result = {
  dayIndex: number;
  typeName: string;
  keyword: string;
};

// 13. 春夏秋冬理論独自命名
export type ShunkashutouResult = {
  cycleYear: number;
  season: '春' | '夏' | '秋' | '冬';
  phase: string;
  themeName: string;
};

// 14. 帝王学
export type TeiouResult = {
  classType: string;
  guidingPrinciple: string;
  cautionTrait: string;
};

// 15. 12支配星
export type ShihaiseiResult = {
  number: number;
  starName: string;
  archetype: string;
  shadowSide: string;
};

// 16. バイオリズム年間カレンダー
export type BiorhythmMonth = {
  yearMonth: string;
  physical: number;
  emotional: number;
  intellectual: number;
  fortune: '大吉' | '吉' | '中吉' | '凶' | '小凶';
  theme: string;
};

export type BiorhythmResult = {
  months: BiorhythmMonth[];
};

// 統合結果
export type CelestialResult = {
  shichu: ShichuResult | { error: string };
  ziwei: ZiweiResult | { error: string };
  kyusei: KyuseiResult | { error: string };
  shukuyou: ShukuyoResult | { error: string };
  maya: MayaResult | { error: string };
  numerology: NumerologyResult | { error: string };
  seiyou: WesternAstroResult | { error: string };
  humandesign: HumanDesignResult | { error: string };
  seimei: SeimeiResult | { error: string };
  sanmei: SanmeiResult | { error: string };
  doubutsu: DoubutsuResult | { error: string };
  days366: Days366Result | { error: string };
  shunkashutou: ShunkashutouResult | { error: string };
  teiou: TeiouResult | { error: string };
  shihaisei: ShihaiseiResult | { error: string };
  biorhythm: BiorhythmResult | { error: string };
  meta: {
    input: CelestialInput;
    executedAt: string;
    durationMs: number;
    successCount: number;
    failureCount: number;
  };
};
