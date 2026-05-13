'use client';

import { useState, useEffect, useCallback } from 'react';
import { DiagnosisProvider } from '@/lib/store/DiagnosisProvider';
import { DiagnosisFlow } from '@/components/diagnosis/DiagnosisFlow';

const STORAGE_KEY = 'dna-limited:first-visit';
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function getRemainingMs(firstVisit: number): number {
  return Math.max(0, firstVisit + FIVE_DAYS_MS - Date.now());
}

function formatCountdown(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const days    = Math.floor(totalSec / 86400);
  const hours   = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

function CountdownBanner({ remainingMs }: { remainingMs: number }) {
  const { days, hours, minutes, seconds } = formatCountdown(remainingMs);
  const isUrgent = remainingMs < 24 * 60 * 60 * 1000;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 text-center py-3 px-4 ${
        isUrgent
          ? 'bg-red-900/95 border-b-2 border-red-500/80'
          : 'bg-navy-deep/95 border-b-2 border-gold/50'
      } backdrop-blur shadow-lg`}
    >
      <span className={`text-sm sm:text-base font-semibold tracking-wide mr-3 ${isUrgent ? 'text-red-200/80' : 'text-offwhite/70'}`}>
        診断期限まで残り
      </span>
      <span className={`text-xl sm:text-2xl font-bold tracking-wider ${isUrgent ? 'text-red-200' : 'text-gold'}`}>
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
        <div className="inline-flex items-center justify-center">
          <svg viewBox="0 0 200 80" width="160" height="64" xmlns="http://www.w3.org/2000/svg" aria-label="DNA SHINDAN AI" className="block opacity-60">
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
          <p className="text-offwhite-dim/70 text-sm">またの機会をお待ちください。</p>
          <div className="w-16 h-px bg-gold/30 mx-auto" />
        </div>
      </div>
    </main>
  );
}

function LandingPage({ onStart, remainingMs }: { onStart: () => void; remainingMs: number }) {
  return (
    <>
      <CountdownBanner remainingMs={remainingMs} />
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 pt-24 bg-gradient-to-b from-navy-deep via-navy to-navy-deep">
        <div className="max-w-3xl w-full space-y-12">
          <header className="text-center space-y-5">
            <div className="inline-flex items-center justify-center">
              <svg viewBox="0 0 200 80" width="240" height="96" xmlns="http://www.w3.org/2000/svg" aria-label="DNA SHINDAN AI" className="block">
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
            <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
              あなたの<span className="text-gold">分身AI</span>を作る、
              <br className="hidden sm:block" />
              ための25分。
            </h1>
            <p className="text-offwhite-dim text-base sm:text-lg leading-relaxed pt-3">
              命術16診断＋心理診断18問＋自由記述8問を統合。<br />
              この結果をAIに渡せば、AIは面白いほどあなたを理解し、すべての話が通じる相棒になる。
            </p>
          </header>

          <div className="bg-gold/10 border border-gold/40 rounded-2xl p-5 sm:p-6 text-left">
            <p className="text-gold text-sm sm:text-base font-bold mb-2">本気で取り組むほど、AIは賢くなる</p>
            <p className="text-sm sm:text-base text-offwhite leading-relaxed">
              真剣に実施すると <strong className="text-gold">1時間ほど</strong>かかります（早ければ20分）。
              <br />
              <strong className="text-gold">より多くの情報量をAIに渡すほど、AIはより正しく詳しく、あなたのことを理解してくれる</strong>ようになります。
              時間を確保して、本気で取り組むことをお勧めします。
            </p>
          </div>

          <div className="bg-navy-soft/40 backdrop-blur rounded-2xl border border-gold/30 p-8 sm:p-10 space-y-6 shadow-2xl">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-xs text-offwhite-dim">所要時間</p>
                <p className="text-xl sm:text-2xl font-bold text-gold">約25分</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-offwhite-dim">設問数</p>
                <p className="text-xl sm:text-2xl font-bold text-gold">全33問</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-offwhite-dim">レポート</p>
                <p className="text-xl sm:text-2xl font-bold text-gold">50ページ以上</p>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onStart}
                className="inline-block bg-gold text-navy-deep font-bold text-lg sm:text-xl px-12 py-4 rounded-full hover:bg-gold-light transition pulse-gold"
              >
                診断をはじめる
              </button>
              <p className="text-xs text-offwhite-dim mt-4">
                途中保存対応 / 24時間以内ならどの端末でも続きから
              </p>
            </div>
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gold/20 p-5 bg-navy-soft/20">
              <p className="text-gold text-xs tracking-wider mb-2">01</p>
              <h3 className="font-bold text-base mb-2">命術16診断</h3>
              <p className="text-sm text-offwhite-dim leading-relaxed">生年月日・時刻・出生地から四柱推命・紫微斗数・西洋占星まで質問ゼロで自動算出</p>
            </div>
            <div className="rounded-xl border border-gold/20 p-5 bg-navy-soft/20">
              <p className="text-gold text-xs tracking-wider mb-2">02</p>
              <h3 className="font-bold text-base mb-2">多軸18問</h3>
              <p className="text-sm text-offwhite-dim leading-relaxed">Big5・エニア・RIASEC・愛情表現・起業家タイプを1問で同時抽出</p>
            </div>
            <div className="rounded-xl border border-gold/20 p-5 bg-navy-soft/20">
              <p className="text-gold text-xs tracking-wider mb-2">03</p>
              <h3 className="font-bold text-base mb-2">分身AIボット</h3>
              <p className="text-sm text-offwhite-dim leading-relaxed">診断後、あなたを学習した個別AIボットURLが届く。家族にも見せたくなる精度</p>
            </div>
          </section>

          <footer className="text-center text-xs text-offwhite-dim/70 space-y-1 pt-4">
            <p>© 2026 DNA Shindan AI</p>
          </footer>
        </div>
      </main>
    </>
  );
}

export default function LimitedPage() {
  const [firstVisit, setFirstVisit] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(FIVE_DAYS_MS);
  const [started, setStarted] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  const tick = useCallback(() => {
    if (firstVisit === null) return;
    setRemainingMs(getRemainingMs(firstVisit));
  }, [firstVisit]);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mounted, tick]);

  if (!mounted || firstVisit === null) {
    return <main className="min-h-screen bg-gradient-to-b from-navy-deep via-navy to-navy-deep" />;
  }

  if (remainingMs <= 0) {
    return <ExpiredScreen />;
  }

  if (started) {
    return (
      <>
        <CountdownBanner remainingMs={remainingMs} />
        <div className="pt-14">
          <DiagnosisProvider>
            <DiagnosisFlow />
          </DiagnosisProvider>
        </div>
      </>
    );
  }

  return <LandingPage onStart={() => setStarted(true)} remainingMs={remainingMs} />;
}
