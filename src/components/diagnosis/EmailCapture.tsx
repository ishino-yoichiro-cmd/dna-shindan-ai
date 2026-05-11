'use client';

import { useState } from 'react';
import { useDiagnosis } from '@/lib/store/DiagnosisProvider';
import { Card, GhostButton, Label, PrimaryButton, StepHeader, TextInput } from './_ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailCapture() {
  const { state, dispatch } = useDiagnosis();
  const email = state.userInfo.email ?? '';
  const [emailConfirm, setEmailConfirm] = useState('');
  const [pasteWarning, setPasteWarning] = useState(false);

  const isFormatValid = EMAIL_RE.test(email);
  const isMatched = email.length > 0 && email === emailConfirm;
  const isValid = isFormatValid && isMatched;

  return (
    <div className="step-enter">
      <Card>
        <StepHeader
          step="STEP 32 / 33"
          title="レポートをお届けするメールアドレス"
          subtitle="完成した50ページ以上のレポートPDFと、あなた専用の分身AIボットURLを、このアドレス宛にお送りします。"
        />

        {/* レポート長さ正当化メッセージ */}
        <div className="mb-5 rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-5">
          <p className="text-xs text-gold tracking-wider mb-2">なぜ50ページ以上の長文レポートなのか</p>
          <p className="text-sm text-offwhite leading-relaxed">
            分身AIに「あなたの魂を移植する」ためには、表層の性格データだけでは足りません。
            命術16診断・心理スコア・あなた自身の言葉を統合した約50ページ以上の深い記述が、
            分身AIの思考の精度を一段引き上げます。
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label>メールアドレス</Label>
            <TextInput
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="例：name@example.com"
              value={email}
              onChange={(e) =>
                dispatch({ type: 'SET_USER_INFO', patch: { email: e.target.value } })
              }
            />
            {email.length > 0 && !isFormatValid && (
              <p className="text-xs text-red-400 mt-1.5">メールアドレスの形式を確認してください</p>
            )}
          </div>

          <div>
            <Label>確認のためもう一度入力してください</Label>
            <TextInput
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="同じアドレスをもう一度"
              value={emailConfirm}
              onChange={(e) => setEmailConfirm(e.target.value)}
              onPaste={(e) => {
                // 確認欄はコピペ防止（タイポ検出のため手入力）
                e.preventDefault();
                setPasteWarning(true);
                setTimeout(() => setPasteWarning(false), 3000);
              }}
            />
            {pasteWarning && (
              <p className="text-xs text-amber-400 mt-1.5">確認のため、もう一度手入力してください</p>
            )}
            {emailConfirm.length > 0 && !isMatched && (
              <p className="text-xs text-red-400 mt-1.5">アドレスが一致しません。確認してください</p>
            )}
            {isMatched && (
              <p className="text-xs text-gold mt-1.5">✓ アドレス一致</p>
            )}
          </div>
        </div>

        <p className="text-[10px] text-offwhite-dim/60 mt-4 leading-relaxed">
          ※ 入力されたメールアドレスは、レポート送付・分身AIボット完成時の通知以外に、開発者YOから新しいAIサービスのご案内が送られることがあります。個人情報は、厳重に管理し、第三者に提供されたり、ご本人の許可なく流用されることは絶対にありませんのでご安心ください。
        </p>

        <div className="flex justify-between items-center mt-8">
          <GhostButton onClick={() => dispatch({ type: 'GO_BACK' })}>戻る</GhostButton>
          <PrimaryButton
            onClick={() => dispatch({ type: 'GO_NEXT' })}
            disabled={!isValid}
          >
            次へ
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
