// 命術16診断の統合エクスポート
import type { CelestialInput, CelestialResult } from './types';
import { parseInput } from './_util';

import { computeShichu } from './shichu';
import { computeZiwei } from './ziwei';
import { computeKyusei } from './kyusei';
import { computeShukuyo } from './shukuyou';
import { computeMaya } from './maya';
import { computeNumerology } from './numerology';
import { computeSeiyou } from './seiyou';
import { computeHumanDesign } from './humandesign';
import { computeSeimei } from './seimei';
import { computeSanmei } from './sanmei';
import { computeDoubutsu } from './doubutsu';
import { computeDays366 } from './days366';
import { computeShunkashutou } from './shunkashutou';
import { computeTeiou } from './teiou';
import { computeShihaisei } from './shihaisei';
import { computeBiorhythm } from './biorhythm';

export type { CelestialInput, CelestialResult } from './types';

function safeRun<T>(label: string, fn: () => T): T | { error: string } {
  try {
    return fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `${label}: ${msg}` };
  }
}

export async function runAllCelestial(input: CelestialInput): Promise<CelestialResult> {
  const start = Date.now();
  const parsed = parseInput(input);

  const result = {
    shichu: safeRun('shichu', () => computeShichu(parsed)),
    ziwei: safeRun('ziwei', () => computeZiwei(parsed)),
    kyusei: safeRun('kyusei', () => computeKyusei(parsed)),
    shukuyou: safeRun('shukuyou', () => computeShukuyo(parsed)),
    maya: safeRun('maya', () => computeMaya(parsed)),
    numerology: safeRun('numerology', () => computeNumerology(parsed)),
    seiyou: safeRun('seiyou', () => computeSeiyou(parsed)),
    humandesign: safeRun('humandesign', () => computeHumanDesign(parsed)),
    seimei: safeRun('seimei', () => computeSeimei(parsed)),
    sanmei: safeRun('sanmei', () => computeSanmei(parsed)),
    doubutsu: safeRun('doubutsu', () => computeDoubutsu(parsed)),
    days366: safeRun('days366', () => computeDays366(parsed)),
    shunkashutou: safeRun('shunkashutou', () => computeShunkashutou(parsed)),
    teiou: safeRun('teiou', () => computeTeiou(parsed)),
    shihaisei: safeRun('shihaisei', () => computeShihaisei(parsed)),
    biorhythm: safeRun('biorhythm', () => computeBiorhythm(parsed)),
  };

  let success = 0;
  let failure = 0;
  for (const v of Object.values(result)) {
    if (v && typeof v === 'object' && 'error' in v) failure++;
    else success++;
  }

  return {
    ...result,
    meta: {
      input,
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      successCount: success,
      failureCount: failure,
    },
  };
}
