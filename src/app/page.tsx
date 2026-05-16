'use client';

import { useEffect, useRef, useState } from 'react';
import { DiagnosisProvider } from '@/lib/store/DiagnosisProvider';
import { DiagnosisFlow } from '@/components/diagnosis/DiagnosisFlow';

const TEXT_SHADOW =
  '0 2px 6px rgba(0,0,0,0.95), 0 4px 14px rgba(0,0,0,0.9), 0 8px 40px rgba(0,0,0,0.85), 0 0 60px rgba(0,0,0,0.6)';

const SUB_SHADOW =
  '0 1px 4px rgba(0,0,0,0.95), 0 2px 10px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.7)';

export default function Home() {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <DiagnosisProvider>
        <DiagnosisFlow />
      </DiagnosisProvider>
    );
  }

  return <Hero onStart={() => setStarted(true)} />;
}

function Hero({ onStart }: { onStart: () => void }) {
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
            <span>33問 / 約25分 / 50ページレポート</span>
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
  );
}
