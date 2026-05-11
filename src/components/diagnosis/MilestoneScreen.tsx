'use client';

import { Card, PrimaryButton } from './_ui';
import { TOTAL_STEPS } from '@/lib/store/types';

interface Props {
  step: number;
  onContinue: () => void;
}

// 30問版マイルストーン：励まし＋進捗％＋次の目印
const MILESTONES: Record<number, { title: string; body: string; nextHint: string }> = {
  5: {
    title: 'いい調子です。',
    body: 'プロフィールから最初の質問群へ。あなたの「日常の動き方」のクセが、ここから少しずつ見えてきます。',
    nextHint: '次は「日常と気質」の残りを駆け抜けましょう。',
  },
  10: {
    title: 'もう10問。',
    body: 'Big Five と エニアグラムの初期スコアが立ち上がってきました。「あなたの動き方の核」が、データの上に少しずつ姿を現しています。',
    nextHint: '次は「人との関わり」へ。あなたの対人OSが見える領域です。',
  },
  15: {
    title: '半分突破、折り返し。',
    body: 'よくここまで来てくれました。ここまでで人との距離感・気質の方向性が固まりつつあります。残り半分で、価値観の核と職業適性が見えてきます。',
    nextHint: '次は「価値観と仕事」へ。あなたが何を譲れない人か、何で輝く人かが立ち上がります。',
  },
  20: {
    title: '20問達成。あと10問。',
    body: '愛情表現・アタッチメント・起業家タイプの推定スコアが確定領域に入りました。ここまでの選択は、すべてAIがあなたを理解するための密度になっています。',
    nextHint: '次は「魂の深掘り」 — あなた自身の言葉で答えるパートに入ります。短くても大丈夫です。',
  },
  23: {
    title: '選択問題、すべて終了。',
    body: 'お疲れさまでした。ここから先は記述問題。あなたの言葉そのものが、AIに渡す情報の精度を一段引き上げます。',
    nextHint: '次は記述問題。1〜2行でも構いません。書ける範囲で。',
  },
};

export function MilestoneScreen({ step, onContinue }: Props) {
  const m = MILESTONES[step];
  if (!m) return null;

  const percent = Math.round((step / TOTAL_STEPS) * 100);
  const remaining = TOTAL_STEPS - step;

  return (
    <div className="step-enter">
      <Card className="text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-1.5 h-1.5 bg-gold rounded-full"
              style={{
                left: `${(i * 17) % 100}%`,
                top: `${(i * 31) % 100}%`,
                opacity: 0.2 + (i % 3) * 0.2,
              }}
            />
          ))}
        </div>

        <div className="relative space-y-5">
          {/* 進捗％ — 大きく */}
          <div className="space-y-1">
            <p className="text-gold text-xs tracking-[0.4em] uppercase">Milestone</p>
            <p className="text-5xl sm:text-6xl font-bold text-gold leading-none">{percent}%</p>
            <p className="text-xs text-offwhite-dim">{step}/{TOTAL_STEPS} 完了 ・ 残り{remaining}問</p>
          </div>

          {/* メインメッセージ */}
          <h2 className="text-xl sm:text-2xl font-bold leading-snug">{m.title}</h2>
          <p className="text-sm text-offwhite-dim leading-relaxed max-w-md mx-auto">
            {m.body}
          </p>

          {/* 進捗バー */}
          <div className="max-w-sm mx-auto h-2 rounded-full bg-offwhite-dim/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* 次の目印 */}
          <p className="text-xs text-gold/80 leading-relaxed max-w-md mx-auto pt-2">
            {m.nextHint}
          </p>

          <div className="pt-4">
            <PrimaryButton onClick={onContinue}>続ける</PrimaryButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
