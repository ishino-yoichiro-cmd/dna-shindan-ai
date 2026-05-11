'use client';

import { useDiagnosis } from '@/lib/store/DiagnosisProvider';
import { Card, Label, TextInput, PrimaryButton, GhostButton, StepHeader } from './_ui';

export function InputName() {
  const { state, dispatch } = useDiagnosis();
  const { lastName, firstName } = state.userInfo;

  // ニックネームでもOK：「名」フィールドに何か入っていれば次へ進める
  // 「姓」も入れると姓名判断（五格・三才配置・81数霊）が加わって精度UP
  const isValid = firstName.trim().length > 0;

  return (
    <div className="step-enter">
      <Card>
        <StepHeader
          step="STEP 1 / 33"
          title="まず、お名前を教えてください"
          subtitle="ニックネームでもOK。本名（姓 + 名）を入れると姓名判断（五格・三才配置・81数霊）が加わり、レポートの精度が一段上がります。"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>姓（任意）</Label>
            <TextInput
              type="text"
              autoComplete="family-name"
              placeholder="苗字（任意）"
              value={lastName}
              onChange={(e) =>
                dispatch({ type: 'SET_USER_INFO', patch: { lastName: e.target.value } })
              }
              maxLength={20}
            />
          </div>
          <div>
            <Label>名 / ニックネーム（必須）</Label>
            <TextInput
              type="text"
              autoComplete="given-name"
              placeholder="お名前 or ニックネーム"
              value={firstName}
              onChange={(e) =>
                dispatch({ type: 'SET_USER_INFO', patch: { firstName: e.target.value } })
              }
              maxLength={20}
            />
          </div>
        </div>

        <p className="text-xs text-offwhite-dim/70 mt-4 leading-relaxed">
          ※ ニックネームのみでも診断は進められます。本名（漢字）でご入力いただくと、姓名判断（旧字体・康熙画数）も加わり、より正確な診断になります。
        </p>

        <div className="flex justify-between items-center mt-8">
          <GhostButton disabled>戻る</GhostButton>
          <PrimaryButton
            onClick={() => dispatch({ type: 'GO_NEXT' })}
            disabled={!isValid}
          >
            次へ
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
