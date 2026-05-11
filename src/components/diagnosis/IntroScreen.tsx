'use client';

import { Card, PrimaryButton } from './_ui';

interface Props {
  onStart: () => void;
  hasResume: boolean;
  onReset: () => void;
}

export function IntroScreen({ onStart, hasResume, onReset }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 step-enter">
      <Card className="max-w-2xl w-full space-y-6">
        <div className="space-y-3 text-center">
          <p className="text-gold text-xs tracking-[0.4em] uppercase">Diagnosis Start</p>
          <h1 className="text-2xl sm:text-4xl font-bold leading-tight">
            これは、あなたの<br />
            <span className="text-gold">分身AI</span>を作るための診断です。
          </h1>
        </div>

        <div className="border-t border-gold/20 pt-5 space-y-4">
          <p className="text-sm text-offwhite-dim leading-relaxed">
            生年月日・名前・30問の回答から、命術16診断と心理プロファイルを統合し、
            <span className="text-offwhite">あなたという人間の設計図</span>を言葉にします。
          </p>
          <div className="rounded-xl border border-gold/40 bg-gold/10 p-4 sm:p-5">
            <p className="text-gold text-xs tracking-wider mb-2 font-bold">精度の高い分身を作るために</p>
            <p className="text-sm text-offwhite leading-relaxed">
              この診断は、答える深さと真剣さがそのまま <strong className="text-gold">あなたの分身の精度</strong>に直結します。
              <br />
              時間がかかっても、本気で向き合って答えてください。中途半端な回答では、中途半端な分身しか生まれません。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center pt-3">
          <Stat label="所要時間" value="約25分" />
          <Stat label="設問数" value="全33問" />
          <Stat label="レポート" value="50ページ以上" />
        </div>

        <ul className="text-xs text-offwhite-dim space-y-1.5 pt-2">
          <li>・途中保存：24時間以内なら同じブラウザから続きを再開できます</li>
          <li>・任意項目（生まれ時刻・出生地）は不明でもOK</li>
          <li>・記述問題はサンプル例文を見ながら書けます</li>
        </ul>

        <div className="text-center pt-4 space-y-3">
          <PrimaryButton onClick={onStart} className="text-lg px-12 py-4">
            診断をはじめる
          </PrimaryButton>
          {hasResume && (
            <button
              onClick={onReset}
              className="block mx-auto text-xs text-offwhite-dim/70 hover:text-gold underline"
            >
              保存中の途中データを破棄して最初からやり直す
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-offwhite-dim mb-1">{label}</p>
      <p className="text-base sm:text-xl font-bold text-gold">{value}</p>
    </div>
  );
}
