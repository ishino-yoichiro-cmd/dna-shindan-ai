'use client';

import type { CelestialPreviewData } from '@/lib/store/types';

interface Props {
  data: CelestialPreviewData;
}

export function CelestialPreview({ data }: Props) {
  return (
    <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-navy-soft/40 to-navy-deep/40 p-5 sm:p-6 fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gold text-xs tracking-[0.3em] uppercase">速報・命術プレビュー</span>
        <span className="shimmer-gold rounded-full h-[2px] flex-1" />
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {data.numerologyLifePath !== undefined && (
          <Cell
            label="数秘ライフパス"
            value={String(data.numerologyLifePath)}
          />
        )}
        {data.shengXiao && (
          <Cell label="干支" value={data.shengXiao} />
        )}
        {data.doubutsu && (
          <Cell label="動物キャラ" value={data.doubutsu} />
        )}
      </div>

      {data.rarityLine && (
        <p className="text-xs sm:text-sm text-offwhite-dim mt-4 leading-relaxed border-t border-gold/15 pt-3">
          {data.rarityLine}
        </p>
      )}

      <p className="text-[10px] text-offwhite-dim/60 mt-3">
        ※ 残り14種の命術（四柱推命・紫微斗数・西洋占星 等）は最終レポートで詳細解説。
      </p>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center bg-navy-deep/40 rounded-lg py-3 px-2 border border-gold/15">
      <p className="text-[10px] text-offwhite-dim mb-1">{label}</p>
      <p className="text-base sm:text-lg font-bold text-gold">{value}</p>
    </div>
  );
}
