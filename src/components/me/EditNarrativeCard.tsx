'use client';

import { useState } from 'react';

interface Props {
  id: string;
  /** 現在ユーザーが認証済みの資格情報。token または password のいずれかを保持する。 */
  credentials: { token?: string; password?: string };
  /** 親が知る現在のステータス（'in_progress' なら再生成ボタンを抑止する）。 */
  status?: string;
}

const NARRATIVE_DEFS: { id: string; title: string; help: string }[] = [
  { id: 'Q31', title: '夢中体験', help: '時間を忘れて没頭した経験を、できるだけ具体的に。' },
  { id: 'Q32', title: '怒り・違和感', help: '「これは絶対に許せない」と感じた経験を3つ。' },
  { id: 'Q33', title: '無償でもやること', help: 'お金や評価がなくても、やってしまうこと。' },
  { id: 'Q34', title: '譲れない信念', help: '「これだけは曲げない」と思っている価値観を3つ。' },
  { id: 'Q35', title: '褒められた強み', help: '人から「あなたのここがすごい」と言われた経験を3つ。' },
  { id: 'Q36', title: '5年後の未来妄想', help: '5年後の「最高にうまくいってる状態」を具体的に。' },
  { id: 'Q37', title: '真似したい人物', help: '「この人みたいになりたい」と思う人物を3人。' },
  { id: 'Q38', title: '分身AIに伝えたいこと（自由記述）', help: '生い立ち・職歴・好きな作品・目標・想い・付き合いたい人など、自由に追記。' },
];

type Phase = 'closed' | 'loading' | 'editing' | 'saving' | 'done';

export default function EditNarrativeCard({ id, credentials, status }: Props) {
  const [phase, setPhase] = useState<Phase>('closed');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; regenerated?: boolean } | null>(null);

  const openEditor = async () => {
    setPhase('loading');
    setResult(null);
    try {
      const params = new URLSearchParams();
      if (credentials.token) params.set('token', credentials.token);
      if (credentials.password) params.set('password', credentials.password);
      const r = await fetch(`/api/me/${id}/narrative?${params.toString()}`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setResult({ ok: false, message: d.error ?? '読み込みに失敗しました。' });
        setPhase('closed');
        return;
      }
      const d = await r.json();
      setAnswers(d.narrativeAnswers ?? {});
      setPhase('editing');
    } catch {
      setResult({ ok: false, message: '読み込みに失敗しました。' });
      setPhase('closed');
    }
  };

  const onChange = (qid: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const submit = async (regenerate: boolean) => {
    setPhase('saving');
    setResult(null);
    try {
      const r = await fetch(`/api/me/${id}/update-narrative`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: credentials.token,
          password: credentials.password,
          narrativeAnswers: answers,
          regenerate,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        setResult({ ok: false, message: d.error ?? '保存に失敗しました。' });
        setPhase('editing');
        return;
      }
      setResult({ ok: true, message: d.message ?? '保存しました。', regenerated: d.regenerated });
      setConfirmRegen(false);
      setPhase('done');
    } catch {
      setResult({ ok: false, message: '保存に失敗しました。' });
      setPhase('editing');
    }
  };

  const reopen = () => {
    setResult(null);
    setPhase('editing');
  };

  const close = () => {
    setPhase('closed');
    setConfirmRegen(false);
    setResult(null);
  };

  // ----- View -----

  if (phase === 'closed') {
    return (
      <div>
        <p className="text-sm text-offwhite-dim leading-relaxed mb-4">
          診断時に書いた自由記述8問の回答を、いつでも編集・追記できます。<br />
          編集だけ保存することも、保存と同時にレポートを再生成することもできます。
        </p>
        <button
          type="button"
          onClick={openEditor}
          className="w-full bg-gold/20 border border-gold/40 text-gold font-bold py-3 rounded-lg text-sm hover:bg-gold/30"
        >
          回答を編集・追記する
        </button>
        {result && !result.ok && (
          <p className="text-xs text-red-300 mt-3">{result.message}</p>
        )}
      </div>
    );
  }

  if (phase === 'loading') {
    return <p className="text-sm text-offwhite-dim">現在の回答を読み込み中…</p>;
  }

  if (phase === 'done' && result?.ok) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-gold/40 bg-gold/10 p-4">
          <p className="text-sm text-gold font-bold mb-1">
            {result.regenerated ? '保存して再生成キューに投入しました' : '保存しました'}
          </p>
          <p className="text-xs text-offwhite leading-relaxed whitespace-pre-wrap">{result.message}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reopen}
            className="flex-1 border border-gold/40 text-gold py-2 rounded-lg text-sm hover:bg-gold/10"
          >
            続けて編集する
          </button>
          <button
            type="button"
            onClick={close}
            className="flex-1 bg-gold text-navy-deep font-bold py-2 rounded-lg text-sm hover:bg-gold-light"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  // editing / saving
  const isSaving = phase === 'saving';
  const isInProgress = status === 'in_progress';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-offwhite-dim/20 bg-navy-deep/40 p-3 text-xs text-offwhite-dim leading-relaxed">
        書き足したい箇所だけ追記する形でも、全文書き直す形でもOKです。空のままにすると、その問は既存の回答を維持します。
      </div>

      {NARRATIVE_DEFS.map((q) => (
        <div key={q.id} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-sm font-bold text-gold">
              {q.id}　{q.title}
            </label>
            <span className="text-[10px] text-offwhite-dim/60 whitespace-nowrap">
              {(answers[q.id] ?? '').length} 字
            </span>
          </div>
          <p className="text-[11px] text-offwhite-dim/80 leading-relaxed">{q.help}</p>
          <textarea
            value={answers[q.id] ?? ''}
            onChange={(e) => onChange(q.id, e.target.value)}
            rows={6}
            disabled={isSaving}
            className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-3 py-2 text-sm text-offwhite placeholder-offwhite-dim/40 focus:border-gold disabled:opacity-50"
            maxLength={8000}
          />
        </div>
      ))}

      {result && !result.ok && (
        <p className="text-xs text-red-300">{result.message}</p>
      )}

      {confirmRegen ? (
        <div className="rounded-lg border border-amber-400/40 bg-amber-900/15 p-4 space-y-3">
          <p className="text-sm text-amber-200 font-bold">レポートを再生成しますか？</p>
          <p className="text-xs text-offwhite leading-relaxed">
            現在のPDFは一旦無効化され、新しい回答でレポートを再生成キューに投入します。完成まで10〜20分かかります。
            <br />※自動メール送信は行いません（管理者が必要に応じて再送できます）。
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmRegen(false)}
              disabled={isSaving}
              className="flex-1 border border-offwhite-dim/30 text-offwhite py-2 rounded-lg text-sm hover:bg-offwhite-dim/10 disabled:opacity-40"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={isSaving}
              className="flex-1 bg-amber-400 text-navy-deep font-bold py-2 rounded-lg text-sm hover:bg-amber-300 disabled:opacity-40"
            >
              {isSaving ? '送信中…' : '保存して再生成する'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={close}
            disabled={isSaving}
            className="flex-1 border border-offwhite-dim/30 text-offwhite py-3 rounded-lg text-sm hover:bg-offwhite-dim/10 disabled:opacity-40"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={isSaving}
            className="flex-1 border border-gold/40 text-gold py-3 rounded-lg text-sm font-bold hover:bg-gold/10 disabled:opacity-40"
          >
            {isSaving ? '保存中…' : '保存のみ（再生成しない）'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmRegen(true)}
            disabled={isSaving || isInProgress}
            title={isInProgress ? '現在生成中のため再生成は完了後にお試しください。' : ''}
            className="flex-1 bg-gold text-navy-deep py-3 rounded-lg text-sm font-bold hover:bg-gold-light disabled:opacity-40"
          >
            {isInProgress ? '再生成中…' : '保存して再生成する'}
          </button>
        </div>
      )}
    </div>
  );
}
