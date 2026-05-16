'use client';

/**
 * 分身AIチャットUIコンポーネント
 *
 * - メッセージ履歴（LocalStorage 24h保存）
 * - ストリーミング応答受信
 * - 初回プロンプト例5つ
 * - モバイル対応（max-w-3xl のセンタリング）
 *
 * LocalStorage キー：`clone-chat:${diagnosisId}`
 * 保存内容：{ messages: ChatMessage[], updatedAt: number(epoch ms) }
 * 24h（86400000ms）超過で自動破棄
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { stripMarkdownToPlain } from '@/lib/text/strip-markdown';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StoredChat {
  messages: ChatMessage[];
  updatedAt: number;
}

const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

// 自分自身を深掘りする質問（本人が壁打ち・自己整理に使う）
const STARTER_PROMPTS_SELF = [
  '今、ちょっと迷っていることがあります。話を聞いてもらえますか？',
  '私の強み、自分でも分かっていないかもしれません。改めて言語化してください。',
  '最近、本気で違和感を覚えたことがありました。私の価値観のどこに触れたのか、一緒に整理してください。',
  '5年後の自分、どう動いているべきだと思いますか？',
  '私が燃え尽きやすいパターンを、過去のレポートから抽出して言葉にしてください。',
];

// 他人がこの分身AIに聞いてみる質問（友人・家族・仲間がこの人を理解するために使う）
const STARTER_PROMPTS_OTHER = [
  'はじめまして。あなたという人を、3つの言葉で表すと？',
  '一緒に何かやるとしたら、あなたの強みはどこに出ますか？',
  'あなたが本気で苦手とするタイプの人や状況は？',
  '連絡が遅い時、頭の中で何が起きていますか？',
  '今この時期、あなたが向き合っていることは何ですか？',
];

// 自分視点の追加深掘りプール
const FOLLOWUP_SELF = [
  ...STARTER_PROMPTS_SELF,
  '今の話、もう少し具体例で教えてください。',
  '私が無意識に避けているテーマを当ててみてください。',
  'この話の核心、一行に凝縮するなら？',
  '私が今やるべき次の一手は何だと思いますか？',
  '私が無理しているサインを教えてください。',
  '私の決断が遅くなる時、頭の中で何が起きていますか？',
  '私が本気でやりたいけど、まだ言語化できていないことを当ててみて。',
  '今の話と、私の価値観のどこが繋がっていますか？',
  'この1週間で、私が一番リアルだった瞬間は？',
];

// 他者視点の追加深掘りプール
const FOLLOWUP_OTHER = [
  ...STARTER_PROMPTS_OTHER,
  'それを別の角度から見ると、どう言い換えられますか？',
  'この話の核心、一行に凝縮するなら？',
  '一緒に仕事するなら、どんな役割が向いていますか？',
  'この人が苦手とする状況はありますか？',
  'この人が感情面で一番大事にしていることは何ですか？',
  'この人がストレスを感じる時のサインを教えてください。',
  'この人への接し方で大事なポイントを教えてください。',
  'この人との信頼関係を深めるには、どうすればいいですか？',
];

// 混合プール（視点が不明な場合）
const FOLLOWUP_POOL = [...FOLLOWUP_SELF, ...FOLLOWUP_OTHER];

function pickFollowups(messages: ChatMessage[], n = 4): string[] {
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) return [];

  const used = new Set(userMessages.map((m) => m.content.trim()));

  // 最初のメッセージで視点を判定し、以降その視点で候補を出し続ける
  const firstMsg = userMessages[0].content.trim();
  const pool = STARTER_PROMPTS_SELF.includes(firstMsg)
    ? FOLLOWUP_SELF
    : STARTER_PROMPTS_OTHER.includes(firstMsg)
    ? FOLLOWUP_OTHER
    : FOLLOWUP_POOL;

  const remaining = pool.filter((p) => !used.has(p));
  if (remaining.length === 0) return [];
  const offset = userMessages.length;
  const result: string[] = [];
  for (let i = 0; i < Math.min(n, remaining.length); i++) {
    result.push(remaining[(offset * 3 + i) % remaining.length]);
  }
  return result;
}

interface ChatUIProps {
  diagnosisId: string;
  cloneNickname: string;
}

export function ChatUI({ diagnosisId, cloneNickname }: ChatUIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const storageKey = useMemo(
    () => `clone-chat:${diagnosisId}`,
    [diagnosisId],
  );

  // ---- LocalStorage 復元 ----
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredChat;
      const age = Date.now() - (parsed.updatedAt ?? 0);
      if (age > STORAGE_TTL_MS) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      if (Array.isArray(parsed.messages)) {
        setMessages(parsed.messages);
      }
    } catch {
      // LocalStorage 利用不可・パース失敗は無視
    }
  }, [storageKey]);

  // ---- LocalStorage 保存 ----
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      const payload: StoredChat = {
        messages,
        updatedAt: Date.now(),
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // 容量オーバー等は無視
    }
  }, [messages, storageKey]);

  // ---- スクロール追従（下に張り付いている時のみ・streaming中はinstant・ユーザー操作優先）----
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    // streaming 中の逐次更新では smooth が重い → instant
    messagesEndRef.current?.scrollIntoView({
      behavior: isStreaming ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages, isStreaming]);

  // ---- ユーザーが上にスクロールしたら自動追従を停止 ----
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const distFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      stickToBottomRef.current = distFromBottom < 80;
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  // ---- 送信 ----
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const userMsg: ChatMessage = { role: 'user', content: trimmed };
      const assistantPlaceholder: ChatMessage = {
        role: 'assistant',
        content: '',
      };
      const historySnapshot = messages.slice();
      setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setInput('');
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/clone/${diagnosisId}/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            history: historySnapshot,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const txt = await res.text().catch(() => '');
          throw new Error(
            `応答エラー(${res.status}): ${txt.slice(0, 200) || '不明'}`,
          );
        }

        // SSE パース
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantText = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // event: ... \n data: ... \n\n の単位で切る
          let idx: number;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const parsed = parseSseBlock(block);
            if (!parsed) continue;
            if (parsed.event === 'delta' && parsed.data?.text) {
              assistantText += parsed.data.text as string;
              setMessages((prev) => {
                const next = prev.slice();
                if (next.length > 0) {
                  next[next.length - 1] = {
                    role: 'assistant',
                    content: assistantText,
                  };
                }
                return next;
              });
            } else if (parsed.event === 'error') {
              throw new Error(
                (parsed.data?.error as string) ?? 'streaming error',
              );
            } else if (parsed.event === 'done') {
              // 完了
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setMessages((prev) => {
          // 失敗した assistant placeholder を削除
          const next = prev.slice();
          if (
            next.length > 0 &&
            next[next.length - 1].role === 'assistant' &&
            !next[next.length - 1].content
          ) {
            next.pop();
          }
          return next;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [diagnosisId, isStreaming, messages],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void sendMessage(input);
    },
    [input, sendMessage],
  );

  const handleStarterClick = useCallback(
    (prompt: string) => {
      void sendMessage(prompt);
    },
    [sendMessage],
  );

  const handleClear = useCallback(() => {
    if (!confirm('会話履歴をクリアしますか？（ローカルにのみ保存されています）')) return;
    setMessages([]);
    setError(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const handleDownload = useCallback(() => {
    if (messages.length === 0) return;
    const lines = messages.map((m) => {
      const label = m.role === 'user' ? 'あなた' : cloneNickname;
      return `【${label}】\n${m.content}`;
    });
    const text = lines.join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cloneNickname}-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, cloneNickname]);

  // ============================================================
  // レンダリング
  // ============================================================

  return (
    <div className="flex flex-col h-full w-full">
      {/* メッセージ表示エリア（外側full-width・内側max-w-3xl中央寄せ） */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <Welcome
            nickname={cloneNickname}
            onSelect={handleStarterClick}
          />
        ) : (
          <>
            {messages.map((m, i) => (
              <Bubble
                key={i}
                role={m.role}
                content={m.content}
                isLast={i === messages.length - 1}
                isStreaming={
                  isStreaming &&
                  i === messages.length - 1 &&
                  m.role === 'assistant'
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
        </div>
      </div>

      {/* エラー表示（中央寄せ） */}
      {error && (
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6">
          <div className="mb-2 px-4 py-2 rounded bg-red-900/40 border border-red-500/40 text-sm text-red-200">
            {error}
          </div>
        </div>
      )}

      {/* フォローアップ候補（messages 1往復以降は常に4つ表示） */}
      {messages.length > 0 && !isStreaming && (
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-2">
          <p className="text-[10px] tracking-[0.2em] text-gold/70 uppercase mb-1.5">Continue</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pickFollowups(messages, 4).map((p, i) => (
              <button
                key={`fu-${i}`}
                type="button"
                onClick={() => void sendMessage(p)}
                className="text-left text-xs text-offwhite-dim border border-gold/20 rounded-lg px-3 py-2 hover:border-gold/50 hover:text-offwhite leading-relaxed"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 入力エリア（フル幅bg・内側max-w-3xl中央寄せ） */}
      <div className="border-t border-gold/20 bg-navy-deep/95 backdrop-blur w-full">
        <div
          className="max-w-3xl mx-auto w-full"
          style={{
            paddingLeft: 'max(env(safe-area-inset-left), 12px)',
            paddingRight: 'max(env(safe-area-inset-right), 12px)',
            paddingTop: 10,
            paddingBottom: 'max(env(safe-area-inset-bottom), 10px)',
          }}
        >
        <form onSubmit={handleSubmit} className="flex gap-2 items-end w-full">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={
              isStreaming ? '応答中...' : 'メッセージを入力（Cmd+Enterで送信）'
            }
            disabled={isStreaming}
            rows={2}
            className="flex-1 resize-none rounded-lg bg-navy-soft/40 border border-gold/30 px-3 py-2 text-offwhite placeholder:text-offwhite-dim/60 focus:outline-none focus:border-gold/60 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="bg-gold text-navy-deep font-bold px-5 py-2 rounded-lg hover:bg-gold-light transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            送信
          </button>
        </form>
        <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 mt-2 text-[10px] sm:text-xs text-offwhite-dim/70 w-full">
          <span className="truncate flex-1 min-w-0">履歴は24時間ローカル保存</span>
          {messages.length > 0 && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleDownload}
                className="hover:text-gold transition whitespace-nowrap"
              >
                テキスト保存
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="hover:text-gold transition whitespace-nowrap"
              >
                履歴クリア
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 子コンポーネント
// ============================================================

function Welcome({
  nickname,
  onSelect,
}: {
  nickname: string;
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="space-y-6 py-6">
      <div className="text-center space-y-2">
        <p className="text-gold text-xs tracking-[0.4em] uppercase">
          Clone AI
        </p>
        <h2 className="text-xl sm:text-2xl font-bold">
          こんにちは、{nickname}です。
        </h2>
        <p className="text-offwhite-dim text-sm leading-relaxed">
          DNA診断レポートで言語化された内容を、すべて記憶しています。
          <br />
          壁打ち・整理・判断、お話しください。下のテーマから始めても構いません。
        </p>
      </div>

      {/* 自分自身を深掘り */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] tracking-[0.3em] text-gold/80 uppercase">For Self</span>
          <span className="text-xs text-offwhite-dim/90 font-bold">自分自身を深掘りするなら</span>
        </div>
        {STARTER_PROMPTS_SELF.map((p, i) => (
          <button
            key={`self-${i}`}
            type="button"
            onClick={() => onSelect(p)}
            className="block w-full text-left px-4 py-3 rounded-lg border border-gold/30 bg-navy-soft/30 hover:border-gold/60 hover:bg-navy-soft/50 transition text-sm text-offwhite leading-relaxed"
          >
            {p}
          </button>
        ))}
      </div>

      {/* 他人から聞く */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] tracking-[0.3em] text-gold/80 uppercase">For Others</span>
          <span className="text-xs text-offwhite-dim/90 font-bold">この人を知りたい人が聞くなら</span>
        </div>
        {STARTER_PROMPTS_OTHER.map((p, i) => (
          <button
            key={`other-${i}`}
            type="button"
            onClick={() => onSelect(p)}
            className="block w-full text-left px-4 py-3 rounded-lg border border-gold/20 bg-navy-soft/20 hover:border-gold/50 hover:bg-navy-soft/40 transition text-sm text-offwhite-dim leading-relaxed"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({
  role,
  content,
  isStreaming,
}: {
  role: 'user' | 'assistant';
  content: string;
  isLast?: boolean;
  isStreaming?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={[
          'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 leading-relaxed text-sm sm:text-base whitespace-pre-wrap break-words',
          isUser
            ? 'bg-gold text-navy-deep rounded-br-sm'
            : 'bg-navy-soft/60 border border-gold/20 text-offwhite rounded-bl-sm',
        ].join(' ')}
      >
        {isUser ? content : stripMarkdownToPlain(content)}
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-gold/60 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}

// ============================================================
// SSE ヘルパ
// ============================================================

function parseSseBlock(block: string): {
  event: string;
  data: Record<string, unknown> | null;
} | null {
  const lines = block.split('\n');
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }
  if (dataLines.length === 0) return null;
  const dataStr = dataLines.join('\n');
  try {
    const data = JSON.parse(dataStr);
    return { event, data };
  } catch {
    return { event, data: null };
  }
}
