// POST /api/celestial-preview
// 入力：{ birthDate: 'YYYY-MM-DD' }
// 出力：{ numerologyLifePath, shengXiao, doubutsu, rarityLine }
//
// 生年月日入力直後に「数秘・干支・希少性・動物キャラ」を即返す軽量エンドポイント。
// 4Lunar算出はせず、Edge互換の自前計算のみ使う。

import { NextRequest } from 'next/server';
import { parseInput } from '@/lib/celestial/_util';
import { computeNumerology } from '@/lib/celestial/numerology';
import { computeDoubutsu } from '@/lib/celestial/doubutsu';

export const runtime = 'edge';

interface RequestBody {
  birthDate?: string;
}

// 簡易干支算出：1924年=甲子起点で12年周期
const SHENG_XIAO = ['子（鼠）', '丑（牛）', '寅（虎）', '卯（兎）', '辰（龍）', '巳（蛇）', '午（馬）', '未（羊）', '申（猿）', '酉（鶏）', '戌（犬）', '亥（猪）'];

function pickShengXiao(year: number): string {
  // 立春前は前年扱いだが、プレビューなので年単位で十分
  const idx = ((year - 4) % 12 + 12) % 12;
  return SHENG_XIAO[idx];
}

function rarityLine(lifePath: number, isMaster: boolean): string {
  if (isMaster) {
    return `ライフパス${lifePath}は人口の約2%。マスター数を持って生まれた稀有な数霊。`;
  }
  // 1〜9の出現率は概ね均等、少しレア感を演出
  const rare = [4, 7];
  if (rare.includes(lifePath)) {
    return `ライフパス${lifePath}は約11%の出現率。深く静かな構造を持つ数霊。`;
  }
  return `ライフパス${lifePath}は人口の約11%。生年月日が示す核となる数霊。`;
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: 'invalid_json' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  const birthDate = body.birthDate ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return new Response(
      JSON.stringify({ error: 'birthDate format must be YYYY-MM-DD' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  try {
    const parsed = parseInput({ birthDate });
    const numerology = computeNumerology(parsed);
    const doubutsu = computeDoubutsu(parsed);
    const shengXiao = pickShengXiao(parsed.year);

    return new Response(
      JSON.stringify({
        numerologyLifePath: numerology.lifePath,
        numerologyMeaning: numerology.meaning,
        isMaster: numerology.isMaster,
        shengXiao,
        doubutsu: doubutsu.fullName,
        rarityLine: rarityLine(numerology.lifePath, numerology.isMaster),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
}
