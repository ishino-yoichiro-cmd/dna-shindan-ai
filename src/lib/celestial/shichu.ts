// 1. 四柱推命（lunar-typescript）
import { Solar } from 'lunar-typescript';
import type { ShichuResult } from './types';
import type { ParsedInput } from './types';
import { mapShiShen, mapNaYin } from './_util';

export function computeShichu(p: ParsedInput): ShichuResult {
  const solar = Solar.fromYmdHms(p.year, p.month, p.day, p.hour, p.minute, 0);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const hasTime = p.hasTime;

  return {
    yearPillar: eightChar.getYear(),
    monthPillar: eightChar.getMonth(),
    dayPillar: eightChar.getDay(),
    timePillar: hasTime ? eightChar.getTime() : null,
    wuXing: {
      year: eightChar.getYearWuXing(),
      month: eightChar.getMonthWuXing(),
      day: eightChar.getDayWuXing(),
      time: hasTime ? eightChar.getTimeWuXing() : null,
    },
    shiShen: {
      year: mapShiShen(eightChar.getYearShiShenGan()),
      month: mapShiShen(eightChar.getMonthShiShenGan()),
      day: mapShiShen(eightChar.getDayShiShenGan()),
      time: hasTime ? mapShiShen(eightChar.getTimeShiShenGan()) : null,
    },
    naYin: {
      year: mapNaYin(eightChar.getYearNaYin()),
      month: mapNaYin(eightChar.getMonthNaYin()),
      day: mapNaYin(eightChar.getDayNaYin()),
      time: hasTime ? mapNaYin(eightChar.getTimeNaYin()) : null,
    },
    jieQi: lunar.getCurrentJieQi()?.getName() || lunar.getPrevJieQi(true)?.getName() || '',
    shengXiao: lunar.getYearShengXiao(),
    lunarDate: `${lunar.getYear()}年${lunar.getMonth()}月${lunar.getDay()}日`,
  };
}
