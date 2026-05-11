'use client';

import { useEffect, useState } from 'react';
import { useDiagnosis } from '@/lib/store/DiagnosisProvider';

interface Props {
  questionId: string;
  choiceId: string;
  choiceText?: string;
}

export function EmpathyMessage({ questionId, choiceId, choiceText }: Props) {
  const { state, dispatch } = useDiagnosis();
  const cached = state.empathyMessages[questionId];
  const [message, setMessage] = useState<string | null>(cached ?? null);

  useEffect(() => {
    if (cached) {
      setMessage(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/empathy', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ questionId, choiceId, choiceText }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setMessage(data.message);
        dispatch({
          type: 'SET_EMPATHY_MESSAGE',
          questionId,
          text: data.message,
        });
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId, choiceId, choiceText]);

  if (!message) return null;

  return (
    <div className="mt-5 fade-in">
      <div className="rounded-xl border border-gold/30 bg-gold/5 px-5 py-3 flex items-start gap-3">
        <span className="text-gold text-base mt-0.5">○</span>
        <p className="text-sm text-offwhite leading-relaxed flex-1">{message}</p>
      </div>
    </div>
  );
}
