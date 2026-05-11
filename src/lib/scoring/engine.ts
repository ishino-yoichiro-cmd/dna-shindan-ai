// スコアリングエンジン本体：runScoring(answers) → ScoreResult

import type { ScoreDelta, MbtiAxis, MbtiDirection } from '@/data/questions';
import { SELECT_QUESTIONS } from '@/data/questions';
import type { ScoringInput, ScoreResult, RawScores } from './types';
import { emptyRawScores, applyWeights, normalizeScores, L_TOUCH_WEIGHT } from './normalizer';
import { judgeAllTopTypes } from './topTypes';

// MBTI方向 → 符号
function mbtiSign(dir: MbtiDirection): number {
  // E/S/T/J が +、I/N/F/P が -、neutral は 0
  if (dir === 'E' || dir === 'S' || dir === 'T' || dir === 'J') return 1;
  if (dir === 'I' || dir === 'N' || dir === 'F' || dir === 'P') return -1;
  return 0;
}

function applyDelta(scores: RawScores, delta: ScoreDelta): void {
  if (delta.big5) {
    for (const [k, v] of Object.entries(delta.big5)) {
      const key = k as keyof typeof scores.big5;
      scores.big5[key] = (scores.big5[key] ?? 0) + (v ?? 0);
    }
  }
  if (delta.mbti) {
    for (const [k, payload] of Object.entries(delta.mbti)) {
      if (!payload) continue;
      const axis = k as MbtiAxis;
      const sign = mbtiSign(payload.dir);
      scores.mbti[axis] = (scores.mbti[axis] ?? 0) + sign * payload.amount;
    }
  }
  if (delta.ennea) {
    for (const [k, v] of Object.entries(delta.ennea)) {
      const key = k as keyof typeof scores.ennea;
      scores.ennea[key] = (scores.ennea[key] ?? 0) + (v ?? 0);
    }
  }
  if (delta.riasec) {
    for (const [k, v] of Object.entries(delta.riasec)) {
      const key = k as keyof typeof scores.riasec;
      scores.riasec[key] = (scores.riasec[key] ?? 0) + (v ?? 0);
    }
  }
  if (delta.vak) {
    for (const [k, v] of Object.entries(delta.vak)) {
      const key = k as keyof typeof scores.vak;
      scores.vak[key] = (scores.vak[key] ?? 0) + (v ?? 0);
    }
  }
  if (delta.attach) {
    for (const [k, v] of Object.entries(delta.attach)) {
      const key = k as keyof typeof scores.attach;
      scores.attach[key] = (scores.attach[key] ?? 0) + (v ?? 0);
    }
  }
  if (delta.love) {
    for (const [k, v] of Object.entries(delta.love)) {
      const key = k as keyof typeof scores.love;
      scores.love[key] = (scores.love[key] ?? 0) + (v ?? 0);
    }
  }
  if (delta.entre) {
    for (const [k, v] of Object.entries(delta.entre)) {
      const key = k as keyof typeof scores.entre;
      scores.entre[key] = (scores.entre[key] ?? 0) + (v ?? 0);
    }
  }
}

export function runScoring(input: ScoringInput): ScoreResult {
  const start = Date.now();
  const raw = emptyRawScores();

  let answeredCount = 0;

  for (const q of SELECT_QUESTIONS) {
    const choiceId = input.selectAnswers[q.id];
    if (!choiceId) continue;
    const choice = q.choices.find((c) => c.id === choiceId);
    if (!choice) continue;
    applyDelta(raw, choice.delta);
    answeredCount++;
  }

  const weighted = applyWeights(raw);
  const normalized = normalizeScores(weighted);
  const topTypes = judgeAllTopTypes(weighted);

  return {
    raw: weighted,
    normalized,
    topTypes,
    meta: {
      answeredCount,
      totalSelectQuestions: SELECT_QUESTIONS.length,
      completionRate: answeredCount / SELECT_QUESTIONS.length,
      weights: { lTouch: L_TOUCH_WEIGHT },
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
    },
  };
}

// 簡易版エイリアス：answers (Record<string,string>) を直接受け取る
export function runScoringFromAnswers(
  answers: Record<string, string>,
  narrative?: Record<string, string>
): ScoreResult {
  return runScoring({ selectAnswers: answers, narrativeAnswers: narrative });
}
