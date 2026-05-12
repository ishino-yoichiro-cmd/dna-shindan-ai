'use client';

import { useState, useEffect, useCallback } from 'react';
import { DiagnosisProvider } from '@/lib/store/DiagnosisProvider';
import { DiagnosisFlow } from '@/components/diagnosis/DiagnosisFlow';

const STORAGE_KEY = 'dna-limited:first-visit';
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function getRemainingMs(firstVisit: number): number {
  return Math.max(0, firstVisit + FIVE_DAYS_MS - Date.now());
}

function formatCountdown(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

function CountdownBanner({ remainingMs }: { remainingMs: number }) {
  const { days, hours, minutes, seconds } = formatCountdown(remainingMs);
  const isUrgent = remainingMs < 24 * 60 * 60 * 1000; // 残り1日未満

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 text-center py-2 px-4 text-xs sm:text-sm font-bold tracking-wide ${
        isUrgent
          ? 'bg-red-900/90 text-red-200 border-b border-red-600/60'
          : 'bg-navy-deep/90 text-gold border-b border-gold/30'
      } backdrop-blur`}
    >
      <span className="opacity-70 mr-2">診断期限まで残り</span>
      <span>
        {days > 0 && `${days}日 `}
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

function ExpiredScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-gradient-to-b from-navy-deep via-navy to-navy-deep">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="inline-flex items-center justify-center">
          <svg
            viewBox="0 0 200 80"
            width="160"
            height="64"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="DNA SHINDAN AI"
            className="block opacity-60"
          >
            <g stroke="#c9a44b" strokeWidth="2" fill="none" strokeLinecap="round">
              <path d="M 18 12 Q 30 30 18 48 Q 6 66 18 80" opacity="0.95" />
              <path d="M 42 12 Q 30 30 42 48 Q 54 66 42 80" opacity="0.95" />
              <line x1="20" y1="20" x2="40" y2="20" opacity="0.55" />
              <line x1="14" y1="32" x2="46" y2="32" opacity="0.7" />
              <line x1="14" y1="46" x2="46" y2="46" opacity="0.7" />
              <line x1="20" y1="60" x2="40" y2="60" opacity="0.55" />
              <line x1="14" y1="72" x2="46" y2="72" opacity="0.7" />
            </g>
            <g fill="#fbfaf6" fontFamily="ui-sans-serif, system-ui, sans-serif">
              <text x="68" y="38" fontSize="22" fontWeight="800" letterSpacing="2">DNA</text>
              <text x="68" y="62" fontSize="13" fontWeight="600" letterSpacing="3" fill="#c9a44b">SHINDAN AI</text>
            </g>
          </svg>
        </div>

        <div className="space-y-4">
          <div className="w-16 h-px bg-gold/30 mx-auto" />
          <p className="text-offwhite text-base sm:text-lg leading-relaxed">
            5日間の実施期限を過ぎたため<br />診断の提供を終了しました。
          </p>
          <p className="text-offwhite-dim/70 text-sm">
            またの機会をお待ちください。
          </p>
          <div className="w-16 h-px bg-gold/30 mx-auto" />
        </div>
      </div>
    </main>
  );
}

export default function LimitedPage() {
  const [firstVisit, setFirstVisit] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(FIVE_DAYS_MS);
  const [mounted, setMounted] = useState(false);

  // 初期化: localStorage から first-visit を取得/設定
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let ts: number;
    if (stored) {
      ts = parseInt(stored, 10);
      if (isNaN(ts)) {
        ts = Date.now();
        localStorage.setItem(STORAGE_KEY, String(ts));
      }
    } else {
      ts = Date.now();
      localStorage.setItem(STORAGE_KEY, String(ts));
    }
    setFirstVisit(ts);
    setRemainingMs(getRemainingMs(ts));
    setMounted(true);
  }, []);

  // カウントダウン更新（1秒ごと）
  const tick = useCallback(() => {
    if (firstVisit === null) return;
    setRemainingMs(getRemainingMs(firstVisit));
  }, [firstVisit]);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mounted, tick]);

  // マウント前はSSR/hydration mismatch 防止のため何も表示しない
  if (!mounted || firstVisit === null) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-navy-deep via-navy to-navy-deep" />
    );
  }

  // 期限切れ
  if (remainingMs <= 0) {
    return <ExpiredScreen />;
  }

  // 期限内 — 通常診断フロー（カウントダウンバナー付き）
  return (
    <>
      <CountdownBanner remainingMs={remainingMs} />
      {/* バナー分の余白 */}
      <div className="pt-10">
        <DiagnosisProvider>
          <DiagnosisFlow />
        </DiagnosisProvider>
      </div>
    </>
  );
}
