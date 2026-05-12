'use client';

import { Card } from './_ui';

interface Props {
  status: 'sending' | 'sent' | 'error';
  email?: string;
  errorMessage?: string;
}

export function CompletionScreen({ status, email, errorMessage }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 step-enter">
      <Card className="max-w-2xl w-full text-center space-y-7 relative overflow-hidden">
        <div className="absolute -inset-1 bg-gradient-to-br from-gold/20 via-transparent to-gold/10 pointer-events-none" />

        <div className="relative space-y-6">
          <div className="flex items-center justify-center pt-4">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 rounded-full bg-gold/10" />
              <div className="absolute inset-3 rounded-full bg-gold/20" />
              <div className="absolute inset-7 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                <span className="text-navy-deep text-2xl font-bold">✓</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-gold text-xs tracking-[0.4em] uppercase">Diagnosis Submitted</p>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
              診断データを<span className="text-gold">お預かり</span>しました
            </h1>
          </div>

          {status === 'sending' && (
            <div className="space-y-3">
              <p className="text-sm text-offwhite-dim leading-relaxed">
                データを保存中です…
              </p>
              <div className="flex items-center justify-center gap-2 text-gold text-sm pt-2">
                <span className="inline-block w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="inline-block w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="inline-block w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {status === 'sent' && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-gold/40 bg-gold/5 p-5 text-left">
                <p className="text-gold text-xs tracking-wider mb-2 font-bold">📨 受領通知メール送信済み</p>
                <p className="text-sm text-offwhite leading-relaxed">
                  {email ? (
                    <><span className="text-gold font-bold">{email}</span> 宛に受領通知メールを送信しました。</>
                  ) : (
                    'ご登録のメールアドレス宛に受領通知メールを送信しました。'
                  )}
                </p>
                <p className="text-sm text-offwhite-dim leading-relaxed mt-3">
                  ただいま、命術16診断と心理スコア・あなたの記述を統合した<strong className="text-gold">約50ページ以上のレポート</strong>と、
                  あなた専用の<strong className="text-gold">分身AIボット</strong>を生成中です。
                </p>
                <p className="text-sm text-offwhite leading-relaxed mt-3">
                  完成までの目安：<strong className="text-gold">30分〜1時間</strong>。完成次第、同じメールアドレス宛にお送りします。
                </p>
              </div>

              <div className="rounded-xl border border-offwhite-dim/20 bg-navy-deep/50 p-4 text-left text-xs text-offwhite-dim space-y-1.5">
                <p className="text-offwhite mb-1.5">準備中の機能</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>50ページ以上の統合レポート（命術16＋心理＋あなたの言葉）</li>
                  <li>あなた専用の分身AIボットURL</li>
                  <li>関係性タグ別のカスタムメッセージ</li>
                </ul>
              </div>

              <p className="text-xs text-offwhite-dim leading-relaxed">
                状況確認・お問い合わせ：
                <a href="mailto:dna@kami-ai.jp" className="text-gold underline ml-1">dna@kami-ai.jp</a>
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-red-300 leading-relaxed">
                データ保存時にエラーが発生しました。
              </p>
              {errorMessage && (
                <p className="text-xs text-offwhite-dim/60">{errorMessage}</p>
              )}
              <p className="text-xs text-offwhite-dim leading-relaxed">
                ブラウザのデータは保持されています。
                <a href="mailto:dna@kami-ai.jp" className="text-gold underline">dna@kami-ai.jp</a>
                までご連絡ください。
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
