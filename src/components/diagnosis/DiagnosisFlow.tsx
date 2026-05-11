'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDiagnosis } from '@/lib/store/DiagnosisProvider';
import { SELECT_QUESTIONS, NARRATIVE_QUESTIONS } from '@/data/questions';
import { TOTAL_STEPS, stepToQuestionId, STORAGE_KEY, STORAGE_KEY_LAST_SUBMIT, STORAGE_KEY_ALL_SUBMISSIONS } from '@/lib/store/types';

import { IntroScreen } from './IntroScreen';
import { ProgressBar } from './ProgressBar';
import { InputName } from './InputName';
import { InputBirthDate } from './InputBirthDate';
import { InputBirthTime } from './InputBirthTime';
import { InputBirthPlace } from './InputBirthPlace';
import { SelectQuestion } from './SelectQuestion';
import { NarrativeQuestion } from './NarrativeQuestion';
import { StyleSample } from './StyleSample';
import { EmailCapture } from './EmailCapture';
import { RelationshipTag } from './RelationshipTag';
import { MilestoneScreen } from './MilestoneScreen';
// ChapterPeek は YOフィードバック（2026-05-04）「いやらしすぎる・モザイクは合理的じゃない」で完全廃止
import { CloneEvolution, EVOLUTION_STEPS } from './CloneEvolution';

const MILESTONE_STEPS = new Set([10, 15, 23]);

export function DiagnosisFlow() {
  const router = useRouter();
  const { state, reset } = useDiagnosis();
  const { currentStep } = state;
  const [introVisible, setIntroVisible] = useState(false);
  const [shownMilestones, setShownMilestones] = useState<Set<number>>(new Set());
  const [shownEvolutions, setShownEvolutions] = useState<Set<number>>(new Set());

  const [submitting, setSubmitting] = useState(false);

  const hasResume =
    typeof window !== 'undefined' &&
    !!window.localStorage.getItem(STORAGE_KEY) &&
    currentStep >= 2;

  useEffect(() => {
    if (currentStep > 1) setIntroVisible(false);
  }, [currentStep]);

  const handleStart = () => {
    setIntroVisible(false);
  };

  const handleResetAndStart = () => {
    reset();
    setIntroVisible(true);
  };

  const showMilestone =
    !introVisible && MILESTONE_STEPS.has(currentStep) && !shownMilestones.has(currentStep);
  const showEvolution =
    !introVisible && EVOLUTION_STEPS.has(currentStep) && !shownEvolutions.has(currentStep);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const scoreRes = await fetch('/api/score', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          answers: state.selectAnswers,
          narrative: state.narrativeAnswers,
        }),
      });
      const scoreData = scoreRes.ok ? await scoreRes.json() : null;

      const submitPayload = {
        userInfo: state.userInfo,
        relationshipTag: state.relationshipTag,
        selectAnswers: state.selectAnswers,
        narrativeAnswers: state.narrativeAnswers,
        styleSample: state.styleSample,
        scoreSnapshot: scoreData,
        submittedAt: new Date().toISOString(),
      };

      // localStorage保存（last-submit + all-submissions append）
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          STORAGE_KEY_LAST_SUBMIT,
          JSON.stringify(submitPayload),
        );
        // 履歴蓄積（管理画面で全件閲覧）
        const prev = window.localStorage.getItem(STORAGE_KEY_ALL_SUBMISSIONS);
        let arr: unknown[] = [];
        try {
          if (prev) arr = JSON.parse(prev);
          if (!Array.isArray(arr)) arr = [];
        } catch {
          arr = [];
        }
        arr.unshift(submitPayload);
        // 最大100件まで保持（古いものから削除）
        if (arr.length > 100) arr = arr.slice(0, 100);
        window.localStorage.setItem(
          STORAGE_KEY_ALL_SUBMISSIONS,
          JSON.stringify(arr),
        );
      }

      // サーバ側へ送信（FSS準拠：statusチェック必須・エラー時はユーザーに通知）
      let submitOk = false;
      let submitErrorMsg = '';
      try {
        const submitRes = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(submitPayload),
        });
        if (submitRes.ok) {
          submitOk = true;
        } else {
          const errData = await submitRes.json().catch(() => ({}));
          submitErrorMsg = (errData as { message?: string }).message ?? `送信エラー (${submitRes.status})`;
        }
      } catch (e) {
        submitErrorMsg = 'ネットワークエラーが発生しました。インターネット接続を確認して再送してください。';
        console.error('[submit] fetch error', e);
      }

      if (!submitOk) {
        // 送信失敗：ユーザーにエラーを表示して再送を促す
        setSubmitting(false);
        // result画面にエラー状態を渡す（localStorageはまだ残っているため再送可）
        router.push(`/diagnosis/result?error=${encodeURIComponent(submitErrorMsg)}`);
        return;
      }

      router.push('/diagnosis/result');
    } catch {
      setSubmitting(false);
    }
  };

  if (introVisible && currentStep === 1) {
    return (
      <IntroScreen
        onStart={handleStart}
        hasResume={hasResume}
        onReset={handleResetAndStart}
      />
    );
  }

  if (showEvolution) {
    return (
      <FlowShell step={currentStep}>
        <CloneEvolution
          step={currentStep}
          onContinue={() => setShownEvolutions(new Set([...shownEvolutions, currentStep]))}
        />
      </FlowShell>
    );
  }
  if (showMilestone) {
    return (
      <FlowShell step={currentStep}>
        <MilestoneScreen
          step={currentStep}
          onContinue={() => setShownMilestones(new Set([...shownMilestones, currentStep]))}
        />
      </FlowShell>
    );
  }

  return (
    <FlowShell step={currentStep}>
      <StepRenderer step={currentStep} onSubmit={handleSubmit} submitting={submitting} />
    </FlowShell>
  );
}

function FlowShell({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <ProgressBar step={step} />
      <main className="max-w-3xl mx-auto px-4 pt-32 pb-16 sm:pt-36">
        {children}
      </main>
    </div>
  );
}

function StepRenderer({
  step,
  onSubmit,
  submitting,
}: {
  step: number;
  onSubmit: () => void;
  submitting: boolean;
}) {
  if (step === 1) return <InputName />;
  if (step === 2) return <InputBirthDate />;
  if (step === 3) return <InputBirthTime />;
  if (step === 4) return <InputBirthPlace />;

  // 多軸選択 18問（Step 5-22, SELECT_STEP_QIDSから取得）
  if (step >= 5 && step <= 22) {
    const qid = stepToQuestionId(step);
    const q = SELECT_QUESTIONS.find((qq) => qq.id === qid);
    if (!q) return <ErrorPlaceholder step={step} />;
    return <SelectQuestion question={q} step={step} />;
  }

  // あなた自身の言葉（記述） 8問（Step 23-30）
  if (step >= 23 && step <= 30) {
    const qid = stepToQuestionId(step);
    const q = NARRATIVE_QUESTIONS.find((qq) => qq.id === qid);
    if (!q) return <ErrorPlaceholder step={step} />;
    return <NarrativeQuestion question={q} step={step} />;
  }

  if (step === 31) return <StyleSample />;
  if (step === 32) return <EmailCapture />;
  if (step === 33) {
    return <RelationshipTag onSubmit={onSubmit} submitting={submitting} />;
  }

  if (step > TOTAL_STEPS) {
    return <ErrorPlaceholder step={step} />;
  }
  return <ErrorPlaceholder step={step} />;
}

function ErrorPlaceholder({ step }: { step: number }) {
  return (
    <div className="text-center text-offwhite-dim py-20">
      <p>未定義のステップ: {step}</p>
    </div>
  );
}
