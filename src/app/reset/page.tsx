'use client';

// 強制セッションリセット用ページ
// 古い localStorage（旧仕様 session-v1 など）が残ってしまった場合の
// 1クリックリカバリ用エンドポイント。
//
// 動作：
// 1. dna-shindan-ai:* で始まる localStorage を全削除
// 2. ServiceWorker があれば解除（PWA キャッシュ排除）
// 3. caches API のキャッシュを全削除
// 4. トップページへハードリダイレクト

import { useEffect, useState } from 'react';

export default function ResetPage() {
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const messages: string[] = [];
    void (async () => {
      try {
        const keys = Object.keys(window.localStorage).filter((k) =>
          k.startsWith('dna-shindan-ai:'),
        );
        keys.forEach((k) => window.localStorage.removeItem(k));
        messages.push(`localStorage: ${keys.length}件 削除`);
      } catch {
        messages.push('localStorage: アクセス不可（無視）');
      }

      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            try {
              await r.unregister();
            } catch {
              /* ignore */
            }
          }
          messages.push(`serviceWorker: ${regs.length}件 解除`);
        }
      } catch {
        messages.push('serviceWorker: アクセス不可（無視）');
      }

      try {
        if ('caches' in window) {
          const names = await caches.keys();
          for (const n of names) {
            try {
              await caches.delete(n);
            } catch {
              /* ignore */
            }
          }
          messages.push(`cache: ${names.length}件 削除`);
        }
      } catch {
        messages.push('cache: アクセス不可（無視）');
      }

      setLog(messages);
      setDone(true);

      // 1.2秒後にトップへ強制遷移（cache-bust付き）
      setTimeout(() => {
        window.location.replace('/?reset=' + Date.now());
      }, 1200);
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-navy-deep via-navy to-navy-deep text-offwhite px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <p className="text-gold text-xs tracking-[0.4em] uppercase">
          Reset Session
        </p>
        <h1 className="text-2xl font-bold">セッションをクリアしています</h1>
        <p className="text-sm text-offwhite-dim leading-relaxed">
          古い保存データを削除してトップページへ戻ります。
          <br />
          診断データ・分身AI・レポートはサーバ側に保存されており、削除されません。
        </p>
        {log.length > 0 && (
          <ul className="text-xs text-offwhite-dim/70 mt-4 text-left bg-navy-deep/40 border border-gold/15 rounded-lg p-3 space-y-1">
            {log.map((l, i) => (
              <li key={i}>· {l}</li>
            ))}
          </ul>
        )}
        {done && (
          <p className="text-xs text-gold pt-2">
            完了 — まもなくトップへ移動します
          </p>
        )}
      </div>
    </main>
  );
}
