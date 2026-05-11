/**
 * 分身AIチャット画面 — dna_diagnoses直読み版
 * URL: /clone/{diagnosis_id}
 */

import Link from 'next/link';
import { getSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { ChatUI } from './chat-ui';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data } = await supabase
      .from('dna_diagnoses')
      .select('clone_display_name, first_name')
      .eq('id', id)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = data as any;
    const name = row?.clone_display_name || row?.first_name || '分身';
    return {
      title: `${name}さんの分身AIボット`,
      description: 'DNA診断AIで生成された分身AIとの対話画面',
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      title: '分身AIボット',
      description: 'DNA診断AIで生成された分身AIとの対話画面',
      robots: { index: false, follow: false },
    };
  }
}

export default async function ClonePage({ params }: PageProps) {
  const { id } = await params;

  let nickname = '分身';
  let exists = false;
  let isProcessing = false;

  try {
    const supabase = getSupabaseServiceRoleClient();
    const { data } = await supabase
      .from('dna_diagnoses')
      .select('id, status, first_name, last_name, clone_system_prompt, clone_display_name')
      .eq('id', id)
      .maybeSingle();
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = data as any;
      if (row) {
        nickname = row.clone_display_name || row.first_name || row.last_name || '分身';
        if (row.status === 'completed' && row.clone_system_prompt) {
          exists = true;
        } else if (row.status === 'received' || row.status === 'processing') {
          isProcessing = true;
        }
      }
    }
  } catch (e) {
    console.error('[clone/[id]/page] supabase error:', e);
  }

  if (isProcessing) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-b from-navy-deep via-navy to-navy-deep">
        <div className="max-w-md w-full text-center space-y-6">
          <p className="text-gold text-xs tracking-[0.4em] uppercase">Clone AI</p>
          <h1 className="text-2xl font-bold">あなたの分身AIを生成中です</h1>
          <p className="text-offwhite-dim text-sm leading-relaxed">
            13章の統合レポートとシステムプロンプトを構築しています。
            完成までの目安は<span className="text-gold">10〜20分</span>。
            完成次第このページが応答可能になります。
          </p>
          <div className="flex items-center justify-center gap-2 text-gold text-sm">
            <span className="inline-block w-2 h-2 bg-gold rounded-full animate-bounce" />
            <span className="inline-block w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="inline-block w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <Link href="/" className="inline-block text-gold underline text-sm">トップへ戻る</Link>
        </div>
      </main>
    );
  }

  if (!exists) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-b from-navy-deep via-navy to-navy-deep">
        <div className="max-w-md w-full text-center space-y-6">
          <p className="text-gold text-xs tracking-[0.4em] uppercase">Clone AI</p>
          <h1 className="text-2xl font-bold">分身AIが見つかりません</h1>
          <p className="text-offwhite-dim text-sm leading-relaxed">
            指定されたURLの分身AIはまだ作成されていないか、URLが正しくない可能性があります。
            診断を完了すると、あなた専用の分身AI URLがメールで届きます。
          </p>
          <Link href="/" className="inline-block bg-gold text-navy-deep font-bold px-6 py-3 rounded-full hover:bg-gold-light transition">
            トップへ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-gradient-to-b from-navy-deep via-navy to-navy-deep text-offwhite">
      <header className="px-3 sm:px-6 py-3 border-b border-gold/20 bg-navy-deep/95 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-gold text-[10px] tracking-[0.3em] uppercase">Clone AI</p>
            <h1 className="text-sm sm:text-lg font-bold truncate">{nickname}さんの分身AIボット</h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={`/match?target=${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gold/40 text-gold font-bold text-[10px] sm:text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-gold/10 whitespace-nowrap"
            >
              この人との相性を診断する
            </Link>
            <Link
              href="/diagnosis"
              className="bg-gold text-navy-deep font-bold text-[10px] sm:text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-gold-light whitespace-nowrap"
            >
              自分も診断して分身AIボットを作る
            </Link>
          </div>
        </div>
      </header>
      <div className="flex-1 min-h-0">
        <ChatUI diagnosisId={id} cloneNickname={nickname} />
      </div>
    </main>
  );
}
