// GET /api/questions
// 質問定義（管理画面で「質問×選択肢」の対応表示用）
// public OK（質問内容は公開しても問題ない設計）

import { SELECT_QUESTIONS, NARRATIVE_QUESTIONS } from '@/data/questions';

export const runtime = 'nodejs';

export async function GET() {
  const questions = [
    ...SELECT_QUESTIONS.map((q) => ({
      id: q.id,
      type: 'select',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      title: (q as any).title,
      prompt: q.prompt,
      choices: q.choices.map((c) => ({ id: c.id, text: c.text })),
    })),
    ...NARRATIVE_QUESTIONS.map((q) => ({
      id: q.id,
      type: 'narrative',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      title: (q as any).title,
      prompt: q.prompt,
    })),
  ];
  return Response.json({ ok: true, questions });
}
