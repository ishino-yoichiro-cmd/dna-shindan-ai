'use client';

import { useDiagnosis } from '@/lib/store/DiagnosisProvider';
import { Card, GhostButton, PrimaryButton, StepHeader, TextArea } from './_ui';

const MIN_CHARS = 100;
const MAX_CHARS = 500;

export function StyleSample() {
  const { state, dispatch } = useDiagnosis();
  const text = state.styleSample;

  const charCount = text.length;
  const canProceed = charCount >= MIN_CHARS;

  return (
    <div className="step-enter">
      <Card>
        <StepHeader
          step="STEP 31 / 33"
          title="あなたの「いつもの文体」を300字くらい書いてください"
          subtitle="分身AIがあなたの口調を完璧にコピーするため。Twitter・LINE・メールで普段書くような文章でOK。テーマは何でも構いません。"
        />

        <div className="mb-4 rounded-lg bg-navy-deep/50 border border-gold/15 p-4 space-y-2">
          <p className="text-xs text-gold tracking-wider">テーマ例（どれか1つ書けばOK）</p>
          <ul className="text-sm text-offwhite-dim space-y-1 list-disc list-inside">
            <li>最近ハマっていること、好きなものについて</li>
            <li>仕事で印象に残った場面と感情</li>
            <li>休日の過ごし方と、そこで感じること</li>
            <li>誰かに最近話したこと、伝えたいこと</li>
          </ul>
        </div>

        <TextArea
          rows={11}
          value={text}
          onChange={(e) => dispatch({ type: 'SET_STYLE_SAMPLE', text: e.target.value })}
          placeholder="ここに、いつもあなたが書くトーンで書いてください。100字以上が目安です。"
          maxLength={MAX_CHARS}
        />

        <div className="flex justify-between items-center mt-2 text-xs">
          <span className={charCount < MIN_CHARS ? 'text-offwhite-dim/50' : 'text-gold'}>
            {charCount} / {MIN_CHARS}文字以上
          </span>
          <span className="text-offwhite-dim/40">最大{MAX_CHARS}文字</span>
        </div>

        <div className="flex justify-between items-center mt-8">
          <GhostButton onClick={() => dispatch({ type: 'GO_BACK' })}>戻る</GhostButton>
          <div className="flex flex-col items-end gap-1">
            {!canProceed && (
              <p className="text-xs text-offwhite-dim/60">あと{MIN_CHARS - charCount}文字書いたら進めます</p>
            )}
            <PrimaryButton
              onClick={() => dispatch({ type: 'GO_NEXT' })}
              disabled={!canProceed}
            >
              次へ
            </PrimaryButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
