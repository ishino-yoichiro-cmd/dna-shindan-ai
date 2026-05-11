'use client';

import { useEffect } from 'react';
import { Card, PrimaryButton } from './_ui';

interface Props {
  step: number;
  onContinue: () => void;
}

// Step 22 = 多軸選択18問完了 / Step 30 = 自由記述8問完了
// PHASES のキーは EVOLUTION_STEPS と同一にすること（不一致で画面真っ白＋進行不能）
const EVOLUTION_STEPS_ARRAY = [22, 30] as const;
export const EVOLUTION_STEPS = new Set<number>(EVOLUTION_STEPS_ARRAY);
type EvolutionStep = (typeof EVOLUTION_STEPS_ARRAY)[number];

const PHASES: Record<EvolutionStep, { phase: string; pct: number; lines: string[] }> = {
  22: {
    phase: 'PHASE 1 — 骨格生成',
    pct: 60,
    lines: [
      'あなたの分身AIの「気質OS」が立ち上がりました。',
      '——Big5の5因子、エニアグラム、対人スタイル。',
      'ここまでで分身は、あなたの『反応のクセ』を持ち始めています。',
    ],
  },
  30: {
    phase: 'PHASE 2 — 言語化と魂の注入',
    pct: 90,
    lines: [
      'あなたの記述が、分身AIの「思考の中身」になりました。',
      '——夢中の対象、怒りの引き金、譲れない信念、尊敬する人、最後の自由記述。',
      'ここから先は、あなたの口調を学習する仕上げ工程に入ります。',
    ],
  },
};

export function CloneEvolution({ step, onContinue }: Props) {
  const p = PHASES[step as EvolutionStep];
  // PHASES に該当 step が無い場合、画面が固まらないように
  // マウント直後に自動で次へ進める（構造的フェイルセーフ）
  useEffect(() => {
    if (!p) onContinue();
  }, [p, onContinue]);
  if (!p) return null;

  return (
    <div className="step-enter">
      <Card className="space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs text-gold tracking-[0.3em] uppercase">分身AI 進化中</p>
          <h2 className="text-xl sm:text-2xl font-bold">{p.phase}</h2>
        </div>

        {/* 進化ビジュアル：パルスする金色のリング */}
        <div className="flex items-center justify-center py-3">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full bg-gold/20 pulse-gold" />
            <div className="absolute inset-3 rounded-full bg-gold/30 animate-pulse" />
            <div className="absolute inset-6 rounded-full bg-gold/40" />
            <div className="absolute inset-0 flex items-center justify-center text-gold text-2xl font-bold">
              {p.pct}%
            </div>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="w-full bg-navy-deep/60 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-gold-light transition-all"
            style={{ width: `${p.pct}%` }}
          />
        </div>

        <div className="space-y-2 text-center">
          {p.lines.map((line, i) => (
            <p key={i} className="text-sm text-offwhite-dim leading-relaxed">{line}</p>
          ))}
        </div>

        <div className="text-center pt-2">
          <PrimaryButton onClick={onContinue}>続ける</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
