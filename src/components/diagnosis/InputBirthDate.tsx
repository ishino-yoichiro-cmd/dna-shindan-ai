'use client';

import { useEffect, useState } from 'react';
import { useDiagnosis } from '@/lib/store/DiagnosisProvider';
import { Card, Label, PrimaryButton, GhostButton, StepHeader } from './_ui';
import { CelestialPreview } from './CelestialPreview';

// 初期値は空。デフォルト日付を勝手に入れない（DNA診断 偽生年月日事故 真因再発防止 2026-05-05）
// input type="date" は iOS英語ロケールで "Jul 14, 1987" 等英語表示になるため
// 年・月・日セレクタに変更（常に日本語表示・全プラットフォーム統一）
// ⚠️ ローカルステートで3値を管理し、全部揃ったときだけglobal storeに書く
//   （部分選択のたびにstoreをクリアするとセレクトがリセットされるバグを防ぐ）

const YEARS = Array.from({ length: 127 }, (_, i) => 2026 - i); // 2026〜1900
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const getDays = (year: number, month: number): number[] => {
  if (!year || !month) return Array.from({ length: 31 }, (_, i) => i + 1);
  return Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
};

export function InputBirthDate() {
  const { state, dispatch } = useDiagnosis();
  const { birthDate } = state.userInfo;

  // ローカルステートで年月日を個別管理
  const [selYear,  setSelYear]  = useState<number>(0);
  const [selMonth, setSelMonth] = useState<number>(0);
  const [selDay,   setSelDay]   = useState<number>(0);

  // birthDate が変わるたびにセレクタに同期する
  // （HYDRATE が useEffect より後に実行されるタイミング問題の根本対策）
  // 注: birthDate がstoreに入っている状態でユーザーが選択し直しても、
  //     同じ値での setSelXxx はReactが差分なしと判断して再レンダリングしないためループ不発生
  useEffect(() => {
    if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      const [y, m, d] = birthDate.split('-').map(Number);
      setSelYear(y);
      setSelMonth(m);
      setSelDay(d);
    }
  }, [birthDate]);

  // 3値が揃ったらstoreに書く
  const commitDate = (y: number, m: number, d: number) => {
    if (!y || !m || !d) return;
    // 月末調整（例: 2月31日→2月28日）
    const maxDay = new Date(y, m, 0).getDate();
    const safeDay = Math.min(d, maxDay);
    const pad = (n: number) => String(n).padStart(2, '0');
    dispatch({
      type: 'SET_USER_INFO',
      patch: { birthDate: `${y}-${pad(m)}-${pad(safeDay)}` },
    });
    if (safeDay !== d) setSelDay(safeDay);
  };

  const handleYear  = (v: number) => { setSelYear(v);  commitDate(v, selMonth, selDay); };
  const handleMonth = (v: number) => { setSelMonth(v); commitDate(selYear, v, selDay); };
  const handleDay   = (v: number) => { setSelDay(v);   commitDate(selYear, selMonth, v); };

  // 命術プレビュー取得
  useEffect(() => {
    if (!birthDate) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/celestial-preview', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ birthDate }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        dispatch({
          type: 'SET_CELESTIAL_PREVIEW',
          data: {
            numerologyLifePath: data.numerologyLifePath,
            shengXiao: data.shengXiao,
            doubutsu: data.doubutsu,
            rarityLine: data.rarityLine,
          },
        });
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [birthDate, dispatch]);

  const isValid  = selYear > 0 && selMonth > 0 && selDay > 0;
  const allFilled = isValid; // storeへの書き込みはcommitDate内で行う
  const days = getDays(selYear, selMonth);

  const selectClass =
    'w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-2 py-3 text-offwhite ' +
    'focus:border-gold outline-none text-center text-lg font-bold cursor-pointer';

  return (
    <div className="step-enter space-y-4">
      <Card>
        <StepHeader
          step="STEP 2 / 33"
          title="生年月日を教えてください"
          subtitle="命術16診断（四柱推命・紫微斗数・西洋占星 等）の根幹データです。"
        />

        <div>
          <Label>生年月日</Label>
          <div className="grid grid-cols-3 gap-2">
            {/* 年 */}
            <select
              value={selYear || ''}
              onChange={(e) => handleYear(Number(e.target.value))}
              className={selectClass}
            >
              <option value="" disabled>年</option>
              {YEARS.map((yr) => (
                <option key={yr} value={yr}>{yr}年</option>
              ))}
            </select>

            {/* 月 */}
            <select
              value={selMonth || ''}
              onChange={(e) => handleMonth(Number(e.target.value))}
              className={selectClass}
            >
              <option value="" disabled>月</option>
              {MONTHS.map((mo) => (
                <option key={mo} value={mo}>{mo}月</option>
              ))}
            </select>

            {/* 日 */}
            <select
              value={selDay || ''}
              onChange={(e) => handleDay(Number(e.target.value))}
              className={selectClass}
            >
              <option value="" disabled>日</option>
              {days.map((dy) => (
                <option key={dy} value={dy}>{dy}日</option>
              ))}
            </select>
          </div>

          {allFilled && (
            <p className="text-sm text-gold mt-3 font-bold text-center">
              {selYear}年 {selMonth}月 {selDay}日
            </p>
          )}
          <p className="text-xs text-offwhite-dim/70 mt-3 leading-relaxed">
            ※ ご自身の正確な生年月日を選んでください（必須）。
          </p>
        </div>

        <div className="flex justify-between items-center mt-8">
          <GhostButton onClick={() => dispatch({ type: 'GO_BACK' })}>戻る</GhostButton>
          <div className="flex flex-col items-end gap-1">
            {!allFilled && (
              <p className="text-xs text-offwhite-dim/60">年・月・日をすべて選んでください</p>
            )}
            <PrimaryButton
              onClick={() => dispatch({ type: 'GO_NEXT' })}
              disabled={!allFilled}
            >
              次へ
            </PrimaryButton>
          </div>
        </div>
      </Card>

      {state.celestialPreview && (
        <CelestialPreview data={state.celestialPreview} />
      )}
    </div>
  );
}
