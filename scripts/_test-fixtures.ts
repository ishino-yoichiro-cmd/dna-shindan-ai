// テスト用ダミーフィクスチャ（モックLLMテスト・実LLMテスト共通）

import type {
  ChapterContext,
  RelationshipTag,
} from '../src/lib/llm';
import type { CelestialResult } from '../src/lib/celestial/types';
import type { ScoreResult } from '../src/lib/scoring/types';

export type { ChapterContext, CelestialResult, ScoreResult, RelationshipTag };

export function buildDummyContext(): ChapterContext {
  // 命術16のダミー（YO本人を想定。1985年生まれ程度の架空値）
  const celestial: CelestialResult = {
    shichu: {
      yearPillar: '乙丑',
      monthPillar: '丁亥',
      dayPillar: '辛卯',
      timePillar: '壬辰',
      wuXing: { year: '木土', month: '火水', day: '金木', time: '水土' },
      shiShen: { year: '偏財', month: '七殺', day: '日主', time: '傷官' },
      naYin: { year: '海中金', month: '屋上土', day: '松柏木', time: '長流水' },
      jieQi: '立冬',
      shengXiao: '丑',
      lunarDate: '1985-09-30',
    },
    ziwei: {
      soul: '紫微',
      body: '貪狼',
      fiveElementsClass: '木三局',
      earthlyBranchOfSoulPalace: '寅',
      earthlyBranchOfBodyPalace: '辰',
      palaces: [],
    },
    kyusei: {
      honmeiSei: { number: 2, name: '二黒土星', element: '土' },
      getsumeiSei: { number: 8, name: '八白土星', element: '土' },
      keishaKyu: '坤宮傾斜',
    },
    shukuyou: {
      xiu27: '心宿',
      xiuLuck: '吉',
      zheng: '正',
      group: '中央群',
    },
    maya: {
      longCount: '12.18.12.7.13',
      tzolkin: { coeff: 13, name: 'Ben' },
      haab: { coeff: 7, month: 'Ceh' },
      kin: 13,
      glyph: '赤い空歩く人',
      galacticTone: 13,
    },
    numerology: {
      lifePath: 22,
      birthDay: 7,
      destiny: 11,
      isMaster: true,
      meaning: 'マスターナンバー22 — 大局的な実装力',
    },
    seiyou: {
      sun: { sign: '蠍座', degree: 14.5, house: 5 },
      moon: { sign: '魚座', degree: 22.0, house: 9 },
      ascendant: { sign: '獅子座', degree: 8.0 },
      midheaven: { sign: '牡牛座', degree: 1.0 },
      planets: [],
      houses: null,
    },
    humandesign: {
      type: 'マニフェスター',
      strategy: '告知してから動く',
      authority: '感情型権威',
      profile: '5/1',
      sunGate: 36,
      earthGate: 6,
      centers: [],
    },
    seimei: {
      lastName: 'サンプル',
      firstName: 'ユーザー',
      strokeCounts: [],
      gokaku: {
        tenkaku: 16,
        jinkaku: 14,
        chikaku: 19,
        sotenkaku: 35,
        gaikaku: 21,
      },
      sansaiHaichi: { ten: '土', jin: '火', chi: '水', harmony: '波乱含み' },
    },
    sanmei: {
      yinSei: { year: '乙丑', month: '丁亥', day: '辛卯' },
      yangSei: { east: '玉堂星', south: '車騎星', center: '司禄星', west: '龍高星', north: '貫索星' },
      mainStar: '司禄星',
    },
    doubutsu: {
      number: 23,
      baseAnimal: '狼',
      variant: '緑の狼',
      fullName: '緑の狼（個性派）',
      color: '緑',
    },
    days366: {
      dayIndex: 305,
      typeName: '冷静な観察者',
      keyword: '透徹',
    },
    shunkashutou: {
      cycleYear: 7,
      season: '秋',
      phase: '実りの仕込み',
      themeName: '実装の秋',
    },
    teiou: {
      classType: '士のクラス',
      guidingPrinciple: '信を立てる',
      cautionTrait: '理屈で人を切らない',
    },
    shihaisei: {
      number: 9,
      starName: '玄武星',
      archetype: '深淵の知恵者',
      shadowSide: '内に閉じる傾向',
    },
    biorhythm: {
      months: [
        { yearMonth: '2026-05', physical: 70, emotional: 60, intellectual: 80, fortune: '吉', theme: '基盤整備' },
        { yearMonth: '2026-06', physical: 75, emotional: 55, intellectual: 85, fortune: '吉', theme: '小さい挑戦' },
        { yearMonth: '2026-07', physical: 80, emotional: 50, intellectual: 75, fortune: '中吉', theme: '見直し' },
        { yearMonth: '2026-08', physical: 60, emotional: 40, intellectual: 65, fortune: '小凶', theme: '休息' },
        { yearMonth: '2026-09', physical: 65, emotional: 55, intellectual: 70, fortune: '吉', theme: '再起動' },
        { yearMonth: '2026-10', physical: 75, emotional: 70, intellectual: 80, fortune: '大吉', theme: '攻めの月' },
        { yearMonth: '2026-11', physical: 70, emotional: 65, intellectual: 75, fortune: '吉', theme: '関係構築' },
        { yearMonth: '2026-12', physical: 65, emotional: 60, intellectual: 70, fortune: '中吉', theme: '振り返り' },
        { yearMonth: '2027-01', physical: 80, emotional: 75, intellectual: 85, fortune: '大吉', theme: '転換期' },
        { yearMonth: '2027-02', physical: 70, emotional: 55, intellectual: 75, fortune: '吉', theme: '実装期' },
        { yearMonth: '2027-03', physical: 65, emotional: 50, intellectual: 70, fortune: '中吉', theme: '調整' },
        { yearMonth: '2027-04', physical: 75, emotional: 65, intellectual: 80, fortune: '吉', theme: '次の準備' },
      ],
    },
    meta: {
      input: { birthDate: '1985-10-31' },
      executedAt: new Date().toISOString(),
      durationMs: 80,
      successCount: 16,
      failureCount: 0,
    },
  };

  // スコアダミー
  const scores: ScoreResult = {
    raw: {
      big5: { O: 18, C: 14, E: 6, A: 12, N: 10 },
      mbti: { EI: -8, SN: 4, TF: -3, JP: -6 },
      ennea: { E1: 8, E2: 4, E3: 6, E4: 11, E5: 14, E6: 5, E7: 7, E8: 9, E9: 6 },
      riasec: { R: 6, I: 14, A: 11, S: 8, EE: 9, Co: 5 },
      vak: { V: 12, Au: 8, K: 6 },
      attach: { 'At-Sec': 8, 'At-Av': 12, 'At-Anx': 6, 'At-Fea': 4 },
      love: { 'L-Time': 10, 'L-Word': 12, 'L-Touch': 4, 'L-Gift': 5, 'L-Act': 9 },
      entre: { EnT1: 5, EnT2: 7, EnT3: 12, EnT4: 8, EnT5: 14, EnT6: 6, EnT7: 9, EnT8: 5 },
    },
    normalized: {
      big5: { O: 90, C: 75, E: 30, A: 65, N: 50 },
      mbti: { EI: -40, SN: 20, TF: -15, JP: -30 },
      ennea: { E1: 40, E2: 20, E3: 30, E4: 55, E5: 70, E6: 25, E7: 35, E8: 45, E9: 30 },
      riasec: { R: 30, I: 70, A: 55, S: 40, EE: 45, Co: 25 },
      vak: { V: 60, Au: 40, K: 30 },
      attach: { 'At-Sec': 40, 'At-Av': 60, 'At-Anx': 30, 'At-Fea': 20 },
      love: { 'L-Time': 50, 'L-Word': 60, 'L-Touch': 20, 'L-Gift': 25, 'L-Act': 45 },
      entre: { EnT1: 25, EnT2: 35, EnT3: 60, EnT4: 40, EnT5: 70, EnT6: 30, EnT7: 45, EnT8: 25 },
    },
    topTypes: {
      mbti: {
        type: 'INTP',
        axes: {
          EI: { letter: 'I', strength: 70 },
          SN: { letter: 'N', strength: 60 },
          TF: { letter: 'T', strength: 58 },
          JP: { letter: 'P', strength: 65 },
        },
      },
      ennea: {
        main: { code: 'E5', name: '探求', score: 70 },
        wing: { code: 'E4', name: '個性', score: 55 },
        expression: '5w4',
      },
      entre: {
        main: { code: 'EnT5', name: 'クリエイター', subtitle: '0→1の創造特化', score: 70 },
        sub: { code: 'EnT3', name: 'アーキテクト', subtitle: '構造の設計者', score: 60 },
      },
      big5DerivedType: {
        code: 'O+C+E-A+',
        label: '内省型実装家',
      },
      riasecTop3: [
        { code: 'I', name: '研究', score: 70 },
        { code: 'A', name: '芸術', score: 55 },
        { code: 'EE', name: '企業', score: 45 },
      ],
      vakTop: { code: 'V', name: '視覚', score: 60 },
      attachTop: { code: 'At-Av', name: '回避', score: 60 },
      loveTop: { code: 'L-Word', name: '言葉', score: 60 },
    },
    meta: {
      answeredCount: 26,
      totalSelectQuestions: 26,
      completionRate: 1,
      weights: { lTouch: 0.5 },
      executedAt: new Date().toISOString(),
      durationMs: 12,
    },
  };

  return {
    user: {
      fullName: 'サンプル ユーザー',
      familyName: 'サンプル',
      givenName: 'ユーザー',
      birthDate: '1985-10-31',
      birthTime: '03:30',
      birthPlaceName: '東京都',
      email: 'yoisno@gmail.com',
      relationshipTag: 'マブダチ' as RelationshipTag,
    },
    celestial,
    scores,
    narrative: {
      Q31: '1) 深夜にコードを書き続けて気がついたら朝になっていた\n2) 講座で受講生の質問に2時間答え続けた\n3) ホワイトボードで戦略を3時間書き直し続けた',
      Q32: '1) 仕事で「とりあえずやっとけ」が許される文化\n2) 言葉の重みを軽くする人\n3) データを見ずに感情で決める意思決定',
      Q33: '人の話を聞いて構造を整理して言語化すること',
      Q34: '1) 一次情報を自分で取りに行く\n2) 言葉を選ぶ\n3) 短期の成果より長期の積み上げ',
      Q35: '1) 「話してると頭が整理される」と言われた\n2) 「言葉のチョイスが的確」と評価された\n3) 「動き出しが早い」と感心された',
      Q36: '5年後、自分のメソッドを20代に教える側に立っている。月3本のコンテンツが回る仕組みを作って、家族と週3回は夕食を一緒にしている。',
      Q37: '1) 高城剛（情報の組み立て方）\n2) ナバル（思考のシンプルさ）\n3) スティーブ・ジョブス（製品哲学）',
      styleSample:
        '今日は朝5時に起きてコーヒーを淹れた。窓の外の桜はもう散り始めていて、それでも光は強くなっている。自分の中で何かが切り替わる季節が来ていることを、身体のほうが先に知っている。新しいものを作る。それが今年のテーマだ。具体的にはまだ言葉にならないが、輪郭は見え始めている。あと数週間で形になる。今のうちに準備を整えておくことが、たぶん全部の鍵になる。',
      ngExpressions: '「真心込めて」「全身全霊で」「魂を込めて」',
    },
  };
}
