'use client';

import { useDiagnosis } from '@/lib/store/DiagnosisProvider';
import type { SelectQuestion as SelectQuestionType } from '@/data/questions';
import { Card, GhostButton, PrimaryButton, StepHeader } from './_ui';

interface Props {
  question: SelectQuestionType;
  step: number;
}

export function SelectQuestion({ question, step }: Props) {
  const { state, dispatch } = useDiagnosis();
  const selected = state.selectAnswers[question.id];

  const handleSelect = (choiceId: string) => {
    dispatch({ type: 'SET_SELECT_ANSWER', questionId: question.id, choiceId });
    // 自動遷移なし。ユーザーが「次へ」ボタンを押すまで待機。
  };

  return (
    <div className="step-enter">
      <Card>
        {/* タイトル/プロンプトの2段表示は廃止。promptだけを大きく1問で表示。 */}
        <StepHeader
          step={`STEP ${step} / 33`}
          title={question.prompt}
        />

        <div className="space-y-3">
          {question.choices.map((c) => {
            const isSelected = selected === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={`w-full text-left rounded-xl px-5 py-4 transition border ${
                  isSelected
                    ? 'bg-gold/20 border-gold text-offwhite'
                    : 'bg-navy-deep/40 border-gold/15 text-offwhite-dim hover:border-gold/50 hover:text-offwhite'
                }`}
              >
                <span
                  className={`inline-block w-6 mr-3 font-bold ${
                    isSelected ? 'text-gold' : 'text-gold/60'
                  }`}
                >
                  {c.id}
                </span>
                <span className="text-base sm:text-lg leading-relaxed">{c.text}</span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center mt-8">
          <GhostButton onClick={() => dispatch({ type: 'GO_BACK' })}>戻る</GhostButton>
          <div className="flex flex-col items-end gap-1">
            {!selected && (
              <p className="text-xs text-offwhite-dim/60">上の選択肢をタップしてから進めます</p>
            )}
            <PrimaryButton
              onClick={() => dispatch({ type: 'GO_NEXT' })}
              disabled={!selected}
            >
              次へ
            </PrimaryButton>
          </div>
        </div>
      </Card>
    </div>
  );
}
