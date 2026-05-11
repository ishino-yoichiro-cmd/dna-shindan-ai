'use client';

import { useState } from 'react';
import { DiagnosisProvider } from '@/lib/store/DiagnosisProvider';
import { DiagnosisFlow } from '@/components/diagnosis/DiagnosisFlow';

export default function Home() {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <DiagnosisProvider>
        <DiagnosisFlow />
      </DiagnosisProvider>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-b from-navy-deep via-navy to-navy-deep">
      <div className="max-w-3xl w-full space-y-12">
        <header className="text-center space-y-5">
          <Logo />
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
            <Stat label="所要時間" value="約25分" />
            <Stat label="設問数" value="全33問" />
            <Stat label="レポート" value="50ページ以上" />
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setStarted(true)}
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
          <Feature
            num="01"
            title="命術16診断"
            text="生年月日・時刻・出生地から四柱推命・紫微斗数・西洋占星まで質問ゼロで自動算出"
          />
          <Feature
            num="02"
            title="多軸18問"
            text="Big5・エニア・RIASEC・愛情表現・起業家タイプを1問で同時抽出"
          />
          <Feature
            num="03"
            title="分身AIボット"
            text="診断後、あなたを学習した個別AIボットURLが届く。家族にも見せたくなる精度"
          />
        </section>

        <footer className="text-center text-xs text-offwhite-dim/70 space-y-1 pt-4">
          <p>© 2026 DNA Shindan AI</p>
        </footer>
      </div>
    </main>
  );
}

function Logo() {
  return (
    <div className="inline-flex items-center justify-center">
      <svg
        viewBox="0 0 200 80"
        width="240"
        height="96"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="DNA SHINDAN AI"
        className="block"
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
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-offwhite-dim">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-gold">{value}</p>
    </div>
  );
}

function Feature({ num, title, text }: { num: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-gold/20 p-5 bg-navy-soft/20">
      <p className="text-gold text-xs tracking-wider mb-2">{num}</p>
      <h3 className="font-bold text-base mb-2">{title}</h3>
      <p className="text-sm text-offwhite-dim leading-relaxed">{text}</p>
    </div>
  );
}
