'use client';

import { CHAPTERS, getCurrentChapter, TOTAL_STEPS } from '@/lib/store/types';

interface Props {
  step: number;
}

export function ProgressBar({ step }: Props) {
  const chapter = getCurrentChapter(step);
  const overallPct = Math.round((step / TOTAL_STEPS) * 100);
  const remainQuestions = Math.max(0, TOTAL_STEPS - step);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-navy-deep/95 backdrop-blur border-b border-gold/30 shadow-lg shadow-navy-deep/50">
      <div className="max-w-3xl mx-auto px-4 py-3 sm:py-4 space-y-2.5">
        {/* メイン進捗バー（はっきり大きく） */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full bg-offwhite-dim/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <span className="text-base sm:text-lg font-bold text-gold whitespace-nowrap">
            {step}<span className="text-sm text-offwhite-dim/60">/{TOTAL_STEPS}</span>
          </span>
        </div>

        {/* 章名＋残時間（読みやすく） */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-offwhite font-semibold tracking-wide">
            <span className="text-gold/80 mr-2">●</span>
            {chapter.title}
          </span>
          <span className="text-offwhite-dim text-xs sm:text-sm">
            残り <span className="text-gold font-bold">{remainQuestions}</span> 問
          </span>
        </div>

        {/* 章ドット（小さく副次的に） */}
        <div className="flex items-center justify-between gap-1 pt-1">
          {CHAPTERS.map((c) => {
            const isDone = step > c.to;
            const isCurrent = step >= c.from && step <= c.to;
            return (
              <div
                key={c.id}
                className="flex-1 min-w-0"
                aria-label={c.title}
              >
                <div
                  className={`h-1 w-full rounded-full ${
                    isDone
                      ? 'bg-gold'
                      : isCurrent
                      ? 'bg-gradient-to-r from-gold to-gold/30'
                      : 'bg-offwhite-dim/15'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
