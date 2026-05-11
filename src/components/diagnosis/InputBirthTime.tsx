'use client';

import { useDiagnosis } from '@/lib/store/DiagnosisProvider';
import { Card, Label, PrimaryButton, GhostButton, StepHeader } from './_ui';

export function InputBirthTime() {
  const { state, dispatch } = useDiagnosis();
  const { birthTime, birthTimeUnknown } = state.userInfo;

  const handleChange = (value: string) => {
    if (value) {
      dispatch({
        type: 'SET_USER_INFO',
        patch: { birthTime: value, birthTimeUnknown: false },
      });
    } else {
      dispatch({ type: 'SET_USER_INFO', patch: { birthTime: undefined } });
    }
  };

  const handleUnknown = () => {
    dispatch({
      type: 'SET_USER_INFO',
      patch: { birthTime: undefined, birthTimeUnknown: true },
    });
  };

  const canProceed = !!birthTime || birthTimeUnknown;

  return (
    <div className="step-enter">
      <Card>
        <StepHeader
          step="STEP 3 / 33 (任意)"
          title="生まれた時刻を教えてください"
          subtitle="紫微斗数・西洋占星アセンダント／MC・ヒューマンデザインの精度に直結します。母子手帳をご確認ください。1分単位で入力（西洋占星のASCは4分で1度動くため）。不明な場合は『不明』を選んで進めます。"
        />

        <div>
          <Label>生まれた時刻（24時間表記・1分単位）</Label>
          <input
            type="time"
            step="60"
            value={birthTime ?? ''}
            disabled={birthTimeUnknown}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-4 py-3 text-offwhite text-lg focus:border-gold outline-none disabled:opacity-40 [color-scheme:dark]"
          />
          <p className="text-xs text-offwhite-dim/70 mt-3 leading-relaxed">
            ※ 例：05:42、14:08、23:55 など。命術の精度のため、できるだけ正確な値を入力してください。
          </p>
        </div>

        <div className="mt-5">
          <button
            onClick={handleUnknown}
            className={`w-full text-sm py-2.5 rounded-lg border ${
              birthTimeUnknown
                ? 'bg-gold/20 border-gold text-gold'
                : 'border-offwhite-dim/30 text-offwhite-dim hover:border-gold/50'
            } transition`}
          >
            生まれた時刻はわからない
          </button>
        </div>

        <div className="flex justify-between items-center mt-8">
          <GhostButton onClick={() => dispatch({ type: 'GO_BACK' })}>戻る</GhostButton>
          <PrimaryButton
            onClick={() => dispatch({ type: 'GO_NEXT' })}
            disabled={!canProceed}
          >
            次へ
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
