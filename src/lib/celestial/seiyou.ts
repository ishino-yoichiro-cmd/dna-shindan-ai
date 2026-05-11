// 7. 西洋占星術（circular-natal-horoscope-js）
// 仕様書罠：month は 0-indexed の罠 → ラッパーで吸収
// circular-natal-horoscope-js はCommonJSのみで型定義もないため、CJS互換requireを使う
import type { WesternAstroResult, ParsedInput, WesternAstroBody } from './types';
import { createRequire } from 'module';
const cjsRequire = createRequire(import.meta.url);

type OriginCtor = new (args: {
  year: number; month: number; date: number;
  hour: number; minute: number;
  latitude: number; longitude: number;
}) => unknown;

type HoroscopeCtor = new (args: {
  origin: unknown;
  houseSystem?: string;
  zodiac?: string;
  aspectPoints?: string[];
  aspectWithPoints?: string[];
  aspectTypes?: string[];
  language?: string;
}) => unknown;

type SignLike = { label?: string; key?: string };
type ChartPosLike = { Ecliptic?: { DecimalDegrees?: number }; StartPosition?: { Ecliptic?: { DecimalDegrees?: number } } };
type CelestialBodyLike = {
  key: string;
  label: string;
  Sign?: SignLike;
  House?: { id?: number };
  ChartPosition?: ChartPosLike;
  isRetrograde?: boolean;
};
type HouseLike = {
  Sign?: SignLike;
  ChartPosition?: ChartPosLike;
};
type HoroscopeLike = {
  SunSign?: SignLike;
  Ascendant?: { Sign?: SignLike; ChartPosition?: ChartPosLike };
  Midheaven?: { Sign?: SignLike; ChartPosition?: ChartPosLike };
  CelestialBodies?: { all?: CelestialBodyLike[] };
  Houses?: HouseLike[];
};

function signLabel(s: SignLike | undefined): string {
  return s?.label ?? s?.key ?? '';
}
function ecliptic(c: ChartPosLike | undefined): number {
  return c?.Ecliptic?.DecimalDegrees ?? c?.StartPosition?.Ecliptic?.DecimalDegrees ?? 0;
}

export function computeSeiyou(p: ParsedInput): WesternAstroResult {
  if (!p.hasTime || !p.hasPlace) {
    // 時刻・出生地のいずれかが不明 → 太陽・月のサインは概算で出すが、ASC/MC/ハウスは不可
    return computeSeiyouLimited(p);
  }

  const lib = cjsRequire('circular-natal-horoscope-js') as { Origin: OriginCtor; Horoscope: HoroscopeCtor };
  const { Origin, Horoscope } = lib;

  const origin = new Origin({
    year: p.year,
    month: p.month - 1, // 0-indexed の罠を吸収
    date: p.day,
    hour: p.hour,
    minute: p.minute,
    latitude: p.latitude,
    longitude: p.longitude,
  });

  const horoscope = new Horoscope({
    origin,
    houseSystem: 'placidus',
    zodiac: 'tropical',
    aspectPoints: ['bodies', 'points', 'angles'],
    aspectWithPoints: ['bodies', 'points', 'angles'],
    aspectTypes: ['major'],
    language: 'en',
  }) as HoroscopeLike;

  const all = horoscope.CelestialBodies?.all ?? [];
  const sun = all.find((b) => b.key === 'sun');
  const moon = all.find((b) => b.key === 'moon');

  const planets: WesternAstroBody[] = all.map((b) => ({
    key: b.key,
    label: b.label,
    sign: signLabel(b.Sign),
    house: b.House?.id ?? null,
    degree: ecliptic(b.ChartPosition),
    isRetrograde: !!b.isRetrograde,
  }));

  return {
    sun: {
      sign: signLabel(sun?.Sign),
      degree: ecliptic(sun?.ChartPosition),
      house: sun?.House?.id ?? null,
    },
    moon: {
      sign: signLabel(moon?.Sign),
      degree: ecliptic(moon?.ChartPosition),
      house: moon?.House?.id ?? null,
    },
    ascendant: horoscope.Ascendant ? {
      sign: signLabel(horoscope.Ascendant.Sign),
      degree: ecliptic(horoscope.Ascendant.ChartPosition),
    } : null,
    midheaven: horoscope.Midheaven ? {
      sign: signLabel(horoscope.Midheaven.Sign),
      degree: ecliptic(horoscope.Midheaven.ChartPosition),
    } : null,
    planets,
    houses: horoscope.Houses?.map((h, i) => ({
      number: i + 1,
      sign: signLabel(h.Sign),
      degree: ecliptic(h.ChartPosition),
    })) ?? null,
  };
}

// 太陽サインのみは生年月日でも算出可能（簡易）
const SUN_SIGN_TABLE: { from: [number, number]; to: [number, number]; sign: string }[] = [
  { from: [3, 21], to: [4, 19], sign: 'Aries' },
  { from: [4, 20], to: [5, 20], sign: 'Taurus' },
  { from: [5, 21], to: [6, 21], sign: 'Gemini' },
  { from: [6, 22], to: [7, 22], sign: 'Cancer' },
  { from: [7, 23], to: [8, 22], sign: 'Leo' },
  { from: [8, 23], to: [9, 22], sign: 'Virgo' },
  { from: [9, 23], to: [10, 23], sign: 'Libra' },
  { from: [10, 24], to: [11, 21], sign: 'Scorpio' },
  { from: [11, 22], to: [12, 21], sign: 'Sagittarius' },
  { from: [12, 22], to: [1, 19], sign: 'Capricorn' },
  { from: [1, 20], to: [2, 18], sign: 'Aquarius' },
  { from: [2, 19], to: [3, 20], sign: 'Pisces' },
];

function getSunSignByDate(month: number, day: number): string {
  for (const { from, to, sign } of SUN_SIGN_TABLE) {
    const [fm, fd] = from;
    const [tm, td] = to;
    if (fm === tm) {
      if (month === fm && day >= fd && day <= td) return sign;
    } else if (fm < tm) {
      if ((month === fm && day >= fd) || (month === tm && day <= td)) return sign;
    } else {
      // 山羊座（年跨ぎ）
      if ((month === fm && day >= fd) || (month === tm && day <= td)) return sign;
    }
  }
  return '';
}

function computeSeiyouLimited(p: ParsedInput): WesternAstroResult {
  const sunSign = getSunSignByDate(p.month, p.day);
  return {
    sun: { sign: sunSign, degree: 0, house: null },
    moon: { sign: '', degree: 0, house: null },
    ascendant: null,
    midheaven: null,
    planets: [],
    houses: null,
    notice: '時刻または出生地が不明のため、太陽サインのみの概算結果です',
  };
}
