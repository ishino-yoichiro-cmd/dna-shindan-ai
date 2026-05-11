'use client';

import { useState } from 'react';
import { useDiagnosis } from '@/lib/store/DiagnosisProvider';
import type { NarrativeQuestion as NarrativeQuestionType } from '@/data/questions';
import { Card, GhostButton, PrimaryButton, StepHeader, TextArea } from './_ui';

interface Props {
  question: NarrativeQuestionType;
  step: number;
}

export function NarrativeQuestion({ question, step }: Props) {
  const { state, dispatch } = useDiagnosis();
  const text = state.narrativeAnswers[question.id] ?? '';
  const [openSampleIdx, setOpenSampleIdx] = useState<number | null>(null);

  // 文字数最低制限を撤廃（YOフィードバック：ライトに、書ける範囲でOK）
  // 1文字以上あれば進める。長く書ける人は書ける、短くても可。
  const charCount = text.length;
  const canProceed = charCount >= 1;

  return (
    <div className="step-enter">
      <Card>
        <StepHeader
          step={`STEP ${step} / 33`}
          title={question.title}
          subtitle={question.prompt}
        />

        {/* ガイド */}
        {question.guide.length > 0 && (
          <div className="mb-4 rounded-lg bg-navy-deep/50 border border-gold/15 p-4">
            <p className="text-xs text-gold tracking-wider mb-2">書くときのヒント</p>
            <ul className="text-sm text-offwhite-dim space-y-1 list-disc list-inside">
              {question.guide.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}

        {/* サンプル例文（薄字） */}
        <div className="mb-4 space-y-2">
          <p className="text-xs text-offwhite-dim/70 mb-1">他の人の例（参考まで）</p>
          {question.samples.map((s, i) => {
            const open = openSampleIdx === i;
            return (
              <div
                key={i}
                className="rounded-lg border border-offwhite-dim/15 bg-navy-deep/30"
              >
                <button
                  onClick={() => setOpenSampleIdx(open ? null : i)}
                  className="w-full text-left px-4 py-2 flex items-center justify-between text-xs text-offwhite-dim/70 hover:text-gold"
                >
                  <span>例 {i + 1}：{s.persona}</span>
                  <span className="text-gold/60">{open ? '閉じる' : '開く'}</span>
                </button>
                {open && (
                  <div className="px-4 pb-3 pt-1 border-t border-offwhite-dim/10">
                    <p className="text-xs text-offwhite-dim/60 leading-relaxed whitespace-pre-wrap">
                      {s.text}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 入力欄 */}
        <TextArea
          rows={9}
          value={text}
          onChange={(e) =>
            dispatch({
              type: 'SET_NARRATIVE_ANSWER',
              questionId: question.id,
              text: e.target.value,
            })
          }
          placeholder="ここに自由に書いてください。文字数や形式は気にしなくてOK。"
          maxLength={2000}
        />

        <div className="flex justify-between items-center mt-2 text-xs">
          <span className="text-offwhite-dim/60">{charCount} 文字</span>
          <span className="text-offwhite-dim/40">短くても長くてもOK・最大2,000文字</span>
        </div>

        <div className="flex justify-between items-center mt-8">
          <GhostButton onClick={() => dispatch({ type: 'GO_BACK' })}>戻る</GhostButton>
          <div className="flex flex-col items-end gap-1">
            {!canProceed && (
              <p className="text-xs text-offwhite-dim/60">何か1文字以上入力すると進めます</p>
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
