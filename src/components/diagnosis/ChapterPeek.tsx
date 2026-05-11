'use client';

import { Card, PrimaryButton } from './_ui';

interface Props {
  step: number;
  onContinue: () => void;
}

// どのステップで章末ぼかし表示を出すか（章の終端）
// 章定義から自動で計算してもよいが、明示制御で安定運用
export const PEEK_STEPS = new Set([12, 21, 30, 37]);

const PEEK_CONTENT: Record<number, { chapter: string; preview: string[] }> = {
  12: {
    chapter: '第1章「日常と気質」',
    preview: [
      'あなたの人生の起点は、午後の静かな時間にある——',
      'コーヒーカップに反射する光と、頭の中で動き始める',
      '本棚の前で、あなたは特定の角度で本を選ぶ。',
      '人といる時間の濃度より、',
    ],
  },
  21: {
    chapter: '第2章「人との関わり」',
    preview: [
      'あなたは、他人の沈黙を恐れない人だ。',
      '会話の途中で訪れる空白を、相手より先に',
      '埋めようとしない。その姿勢が、深い信頼を呼び込む。',
      '一方で、表層的な雑談に',
    ],
  },
  30: {
    chapter: '第3章「価値観と仕事」',
    preview: [
      'あなたが本当にお金より大事にしているものは、',
      '「自分の感覚で判断できる余白」だ。',
      'これを侵された瞬間、あなたは黙って距離をとる。',
      '誰にも気づかれない速度で、',
    ],
  },
  37: {
    chapter: '第4章「魂の深掘り」',
    preview: [
      'あなたが何度も何度も、人生で繰り返す選択がある。',
      '怒りの引き金は、過去のあの瞬間に',
      '繋がっている。それが分かったとき、',
      'あなたの「譲れないもの」は',
    ],
  },
};

export function ChapterPeek({ step, onContinue }: Props) {
  const c = PEEK_CONTENT[step];
  if (!c) return null;

  return (
    <div className="step-enter">
      <Card className="space-y-5">
        <div className="text-center space-y-2">
          <p className="text-xs text-gold tracking-[0.3em] uppercase">完成レポートの一部</p>
          <h2 className="text-xl font-bold">{c.chapter} 完成プレビュー</h2>
          <p className="text-sm text-offwhite-dim">
            あなたの最終レポートには、こんな文章が綴られます。
          </p>
        </div>

        {/* ぼかしレポートプレビュー */}
        <div className="relative rounded-xl border border-gold/20 bg-offwhite/5 p-6 overflow-hidden">
          <div className="report-blur space-y-2 text-offwhite font-serif text-sm leading-loose">
            {c.preview.map((line, i) => (
              <p key={i}>{line}{'　'.repeat(20)}</p>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-navy-soft/50 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-gold tracking-wider">
            ※ 最終レポートで全文公開
          </div>
        </div>

        <div className="text-center pt-2">
          <PrimaryButton onClick={onContinue}>次の章へ進む</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
