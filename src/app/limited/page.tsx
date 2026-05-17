'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { DiagnosisProvider } from '@/lib/store/DiagnosisProvider';
import { DiagnosisFlow } from '@/components/diagnosis/DiagnosisFlow';

const STORAGE_KEY = 'dna-limited:first-visit';
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

const TEXT_SHADOW =
  '0 2px 6px rgba(0,0,0,0.95), 0 4px 14px rgba(0,0,0,0.9), 0 8px 40px rgba(0,0,0,0.85), 0 0 60px rgba(0,0,0,0.6)';

const SUB_SHADOW =
  '0 1px 4px rgba(0,0,0,0.95), 0 2px 10px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.7)';

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
          : 'bg-[#02060f]/95 border-b-2 border-[#c9a44b]/50'
      } backdrop-blur shadow-lg`}
    >
      <span className={`text-sm sm:text-base font-semibold tracking-wide mr-3 ${isUrgent ? 'text-red-200/80' : 'text-white/70'}`}>
        診断期限まで残り
      </span>
      <span className={`text-xl sm:text-2xl font-bold tracking-wider ${isUrgent ? 'text-red-200' : 'text-[#e3c47a]'}`}>
        {days > 0 && `${days}日 `}
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

function ExpiredScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16 bg-[#02060f] text-white">
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
          <div className="w-16 h-px bg-[#c9a44b]/30 mx-auto" />
          <p className="text-white text-base sm:text-lg leading-relaxed">
            5日間の実施期限を過ぎたため<br />診断の提供を終了しました。
          </p>
          <p className="text-white/60 text-sm">またの機会をお待ちください。</p>
          <div className="w-16 h-px bg-[#c9a44b]/30 mx-auto" />
        </div>
      </div>
    </main>
  );
}

function Hero({ onStart, remainingMs }: { onStart: () => void; remainingMs: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.0004,
      vy: (Math.random() - 0.5) * 0.0004,
      a: Math.random() * 0.6 + 0.2,
    }));

    let raf = 0;
    const start = performance.now();

    const draw = () => {
      const t = (performance.now() - start) / 1000;

      const g = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.7,
      );
      g.addColorStop(0, '#0a1f44');
      g.addColorStop(0.55, '#050f24');
      g.addColorStop(1, '#02060f');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      const helixHeight = Math.min(height * 0.85, 720);
      const radius = Math.min(width * 0.18, 160);
      const turns = 3.4;
      const points = 110;

      for (let i = 0; i < points; i++) {
        const u = i / (points - 1);
        const y = (u - 0.5) * helixHeight;
        const angle = u * Math.PI * 2 * turns + t * 0.12;
        const x1 = Math.cos(angle) * radius;
        const x2 = Math.cos(angle + Math.PI) * radius;
        const depth1 = (Math.sin(angle) + 1) / 2;
        const depth2 = (Math.sin(angle + Math.PI) + 1) / 2;

        if (i % 4 === 0) {
          ctx.strokeStyle = `rgba(201, 164, 75, ${0.08 + depth1 * 0.18})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
        }

        ctx.fillStyle = `rgba(227, 196, 122, ${0.35 + depth1 * 0.55})`;
        ctx.beginPath();
        ctx.arc(x1, y, 1.6 + depth1 * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(245, 241, 230, ${0.18 + depth2 * 0.42})`;
        ctx.beginPath();
        ctx.arc(x2, y, 1.2 + depth2 * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        const flicker = 0.6 + Math.sin(t * 0.9 + p.x * 30) * 0.4;
        ctx.fillStyle = `rgba(201, 164, 75, ${p.a * flicker * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.75,
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <CountdownBanner remainingMs={remainingMs} />
      <main className="relative h-screen w-screen overflow-hidden bg-[#02060f]">
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[60%] bg-gradient-to-b from-transparent via-black/45 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#c9a44b]/30 bg-black/40 px-4 py-1.5 text-sm font-medium text-[#e3c47a]/95 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c9a44b] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c9a44b]" />
              </span>
              <span>33問 / 約25分</span>
            </div>

            <h1 className="font-bold tracking-tight leading-[1.08]">
              <span className="block whitespace-nowrap text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl">
                <span className="text-white" style={{ textShadow: TEXT_SHADOW }}>あなたの</span>
                <span
                  className="bg-gradient-to-r from-[#e3c47a] via-[#f5e5b8] to-[#c9a44b] bg-clip-text text-transparent"
                  style={{
                    textShadow: 'none',
                    filter:
                      'drop-shadow(0 2px 4px rgba(0,0,0,0.9)) drop-shadow(0 4px 14px rgba(0,0,0,0.8)) drop-shadow(0 8px 30px rgba(0,0,0,0.65))',
                  }}
                >
                  分身AI
                </span>
                <span className="text-white" style={{ textShadow: TEXT_SHADOW }}>を作る、</span>
              </span>
              <span
                className="block text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl text-white"
                style={{ textShadow: TEXT_SHADOW }}
              >
                ための25分。
              </span>
            </h1>

            <p
              className="mt-7 text-base sm:text-lg text-white/90 max-w-2xl leading-relaxed"
              style={{ textShadow: SUB_SHADOW }}
            >
              命術16診断＋心理診断18問＋自由記述8問を統合。
              <br className="hidden sm:block" />
              50ページ超えの診断レポート＋あなた専用の分身AIボットを自動生成。
            </p>

            <p
              className="mt-9 text-sm sm:text-base font-bold text-[#e3c47a] tracking-wide"
              style={{ textShadow: SUB_SHADOW }}
            >
              時間をかけて真剣に取り組むほど、分身は賢くなります。
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center gap-2 rounded-full border border-[#d22020] px-9 py-4 text-base font-bold text-white transition cursor-pointer hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100"
                style={{
                  background:
                    'linear-gradient(180deg, #d11a1a 0%, #a01010 45%, #5e0606 100%)',
                  boxShadow:
                    '0 0 36px rgba(196, 24, 24, 0.55), 0 14px 32px rgba(0,0,0,0.6), 0 6px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.45)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                }}
              >
                診断をはじめる
                <span aria-hidden>→</span>
              </button>
            </div>
          </div>
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
    return <main className="min-h-screen bg-[#02060f]" />;
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

  return <Hero onStart={() => setStarted(true)} remainingMs={remainingMs} />;
}
