// 14. 帝王学（自前）— 既存命術スコアの再解釈（軽量版）
// 日干＋数秘ライフパスで「帝王学クラス」を判定する独自実装
import { Solar } from 'lunar-typescript';
import type { TeiouResult, ParsedInput } from './types';
import { reduceNumber } from './_util';

const CLASS_TYPES: Record<string, { principle: string; caution: string }> = {
  '王者型': { principle: '統べる者は最も奉仕する', caution: '独善に陥らぬよう諫言を求めよ' },
  '賢者型': { principle: '知は行動と一体化して初めて力になる', caution: '机上の空論で終わらせるな' },
  '勇将型': { principle: '行動こそ真理を顕す', caution: '思慮なき突進は組織を毀損する' },
  '名宰型': { principle: '影に徹し本流を支える', caution: '己の名を惜しんで動きを止めるな' },
  '革新型': { principle: '常識の破壊と再構築', caution: '破壊の快楽に酔うな' },
  '慈愛型': { principle: '愛で人を動かす王道', caution: '甘さは敵を増幅する' },
  '悟達型': { principle: '達観こそ最強の戦略', caution: '冷淡と達観を混同するな' },
  '結縁型': { principle: '人脈は資本に勝る', caution: '広く浅い関係は薄っぺらい縁になる' },
  '錬磨型': { principle: '一道を極めた者が世界を変える', caution: '視野狭窄に陥るな' },
};

const CLASS_LIST = Object.keys(CLASS_TYPES);

export function computeTeiou(p: ParsedInput): TeiouResult {
  const solar = Solar.fromYmdHms(p.year, p.month, p.day, 12, 0, 0);
  const lunar = solar.getLunar();
  const dayStem = lunar.getEightChar().getDay()[0];

  const lifePath = reduceNumber(reduceNumber(p.year) + reduceNumber(p.month) + reduceNumber(p.day));

  // 日干（甲〜癸の10種）と数秘ライフパス（1〜9, 11, 22, 33）を組合せて9クラスに割当
  const stemIndex = '甲乙丙丁戊己庚辛壬癸'.indexOf(dayStem);
  const lpIndex = (lifePath - 1) % 9;
  const classIndex = (stemIndex + lpIndex) % 9;
  const classType = CLASS_LIST[classIndex];
  const meta = CLASS_TYPES[classType];

  return {
    classType,
    guidingPrinciple: meta.principle,
    cautionTrait: meta.caution,
  };
}
