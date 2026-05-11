// 命術16結果 → 自然言語要約コンテキスト
//
// 13章すべてが共通参照する「ユーザーの命術＋スコア要約」を作る。
// この要約をユーザーメッセージの先頭に挿入し、cache_control: ephemeral を付ける。
// 各章ではこの要約をそのまま使い回せばよい。プロンプトキャッシュの読み出し対象。
//
// 重要：1診断内では同じユーザーに対して常に同じ文字列が生成されるよう
//      JSON.stringify は使わず、確定的なフォーマット文字列で構築する。
//      キーの順序を固定し、未確定値は「未取得」として一貫表記。

import type { CelestialResult } from '@/lib/celestial/types';
import type { ScoreResult } from '@/lib/scoring/types';
import type { ChapterContext, NarrativeBundle, UserProfile } from '../types';

function fmt(value: unknown): string {
  if (value === null || value === undefined) return '未取得';
  if (typeof value === 'string') return value || '未取得';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
  return JSON.stringify(value);
}

// 0/100の極値スコアを記述語に変換（LLMに数値ラベルを直接見せない）
// 0/100はmin-max正規化の相対順位であり「皆無/絶対的最高」ではないため、
// 数値をそのまま渡すと「L-Touch=0」「サポーター100点」等の誤引用を誘発する。
function maskScore(v: number): string {
  if (v === 100) return '最高（他項目と比較して群を抜いて高い）';
  if (v === 0)   return '最低（他項目と比較して最も低い）';
  if (v >= 85)   return `非常に高い(${v})`;
  if (v >= 65)   return `高い(${v})`;
  if (v >= 45)   return `中程度(${v})`;
  if (v >= 25)   return `低い(${v})`;
  return             `非常に低い(${v})`;
}

function maskScoreMap<K extends string>(obj: Record<K, number>, keys: K[]): string {
  return keys.map(k => `${k}=${maskScore(obj[k])}`).join(' ');
}

function celestialBlock(c: CelestialResult | null | undefined): string {
  const lines: string[] = [];
  lines.push('## 命術16診断');

  if (!c || typeof c !== 'object') {
    lines.push('- 命術データ未取得（生年月日・時刻・出生地が不足）');
    return lines.join('\n');
  }

  const isErr = (v: unknown): v is { error: string } =>
    Boolean(v && typeof v === 'object' && 'error' in v);

  // 四柱
  if (!isErr(c.shichu)) {
    const s = c.shichu;
    lines.push(
      `- 四柱推命：年柱${fmt(s.yearPillar)} / 月柱${fmt(s.monthPillar)} / 日柱${fmt(s.dayPillar)} / 時柱${fmt(s.timePillar)}`,
    );
    lines.push(
      `  五行：年${fmt(s.wuXing.year)} 月${fmt(s.wuXing.month)} 日${fmt(s.wuXing.day)} 時${fmt(s.wuXing.time)}`,
    );
    lines.push(`  節気：${fmt(s.jieQi)} 干支：${fmt(s.shengXiao)}`);
  }

  // 紫微斗数
  if (!isErr(c.ziwei)) {
    const z = c.ziwei;
    lines.push(
      `- 紫微斗数：命主${fmt(z.soul)} / 身主${fmt(z.body)} / 五行局${fmt(z.fiveElementsClass)}`,
    );
    lines.push(
      `  命宮地支：${fmt(z.earthlyBranchOfSoulPalace)} 身宮地支：${fmt(z.earthlyBranchOfBodyPalace)}`,
    );
  }

  // 九星気学
  if (!isErr(c.kyusei)) {
    const k = c.kyusei;
    lines.push(
      `- 九星気学：本命星${fmt(k.honmeiSei?.name)} / 月命星${fmt(k.getsumeiSei?.name)} / 傾斜${fmt(k.keishaKyu)}`,
    );
  }

  // 宿曜
  if (!isErr(c.shukuyou)) {
    const s = c.shukuyou;
    lines.push(`- 宿曜：${fmt(s.xiu27)} / 群${fmt(s.group)} 相性運${fmt(s.xiuLuck)}`);
  }

  // マヤ暦
  if (!isErr(c.maya)) {
    const m = c.maya;
    lines.push(
      `- マヤ暦：KIN${fmt(m.kin)} / 紋章${fmt(m.glyph)} / 銀河の音${fmt(m.galacticTone)}`,
    );
  }

  // 数秘
  if (!isErr(c.numerology)) {
    const n = c.numerology;
    lines.push(
      `- 数秘術：ライフパス${fmt(n.lifePath)}${n.isMaster ? `（マスターナンバー${fmt(n.lifePath)}）` : ''} / 誕生数${fmt(n.birthDay)} / 運命数${fmt(n.destiny)}`,
    );
  }

  // 西洋占星
  if (!isErr(c.seiyou)) {
    const w = c.seiyou;
    lines.push(
      `- 西洋占星：太陽${fmt(w.sun.sign)} / 月${fmt(w.moon.sign)} / ASC${fmt(w.ascendant?.sign)} / MC${fmt(w.midheaven?.sign)}`,
    );
  }

  // ヒューマンデザイン風
  if (!isErr(c.humandesign)) {
    const h = c.humandesign;
    lines.push(
      `- ヒューマンデザイン風：型${fmt(h.type)} / 戦略${fmt(h.strategy)} / 権威${fmt(h.authority)} / プロファイル${fmt(h.profile)}`,
    );
  }

  // 姓名判断
  if (!isErr(c.seimei)) {
    const s = c.seimei;
    lines.push(
      `- 姓名判断：天格${fmt(s.gokaku?.tenkaku)} 人格${fmt(s.gokaku?.jinkaku)} 地格${fmt(s.gokaku?.chikaku)} 外格${fmt(s.gokaku?.gaikaku)} 総格${fmt(s.gokaku?.sotenkaku)}`,
    );
    lines.push(
      `  三才配置：天${fmt(s.sansaiHaichi?.ten)} 人${fmt(s.sansaiHaichi?.jin)} 地${fmt(s.sansaiHaichi?.chi)} (${fmt(s.sansaiHaichi?.harmony)})`,
    );
  }

  // 算命学
  if (!isErr(c.sanmei)) {
    const a = c.sanmei;
    lines.push(`- 算命学：主星${fmt(a.mainStar)} / 陰占年${fmt(a.yinSei?.year)} 月${fmt(a.yinSei?.month)} 日${fmt(a.yinSei?.day)}`);
  }

  // 動物キャラ
  if (!isErr(c.doubutsu)) {
    const d = c.doubutsu;
    lines.push(`- 動物キャラ：${fmt(d.fullName)} (${fmt(d.color)})`);
  }

  // 366日
  if (!isErr(c.days366)) {
    const d = c.days366;
    lines.push(`- 366日タイプ：${fmt(d.typeName)} / キーワード「${fmt(d.keyword)}」`);
  }

  // 春夏秋冬
  if (!isErr(c.shunkashutou)) {
    const s = c.shunkashutou;
    lines.push(`- 春夏秋冬理論：${fmt(s.season)} / 周期${fmt(s.cycleYear)}年目 / ${fmt(s.themeName)}`);
  }

  // 帝王学
  if (!isErr(c.teiou)) {
    const t = c.teiou;
    lines.push(
      `- 帝王学：${fmt(t.classType)} / 指針「${fmt(t.guidingPrinciple)}」 / 注意点「${fmt(t.cautionTrait)}」`,
    );
  }

  // 12支配星
  if (!isErr(c.shihaisei)) {
    const s = c.shihaisei;
    lines.push(
      `- 12支配星：${fmt(s.starName)} / 原型${fmt(s.archetype)} / 影${fmt(s.shadowSide)}`,
    );
  }

  // バイオリズム（要約のみ）
  if (!isErr(c.biorhythm)) {
    const months = c.biorhythm.months.slice(0, 12);
    const summary = months
      .map((m) => `${m.yearMonth}:${m.fortune}`)
      .join(' / ');
    lines.push(`- バイオリズム12ヶ月：${summary}`);
  }

  return lines.join('\n');
}

function scoresBlock(s: ScoreResult | null | undefined): string {
  const lines: string[] = [];
  lines.push('## 心理スコア（正規化 0-100）');

  // 不完全データ（テストや途中保存）に対する null-safe フォールバック
  if (!s || typeof s !== 'object' || !('normalized' in s) || !s.normalized) {
    lines.push('- スコア未取得（質問30問の回答が不完全のためスキップ）');
    return lines.join('\n');
  }

  const big5 = s.normalized.big5;
  lines.push(
    `- Big5：O=${maskScore(big5.O)} C=${maskScore(big5.C)} E=${maskScore(big5.E)} A=${maskScore(big5.A)} N=${maskScore(big5.N)}`,
  );

  const ennea = maskScoreMap(
    s.normalized.ennea as Record<string, number>,
    Object.keys(s.normalized.ennea),
  );
  lines.push(`- エニアグラム：${ennea}`);

  const riasec = maskScoreMap(
    s.normalized.riasec as Record<string, number>,
    Object.keys(s.normalized.riasec),
  );
  lines.push(`- RIASEC：${riasec}`);

  const vak = s.normalized.vak;
  lines.push(`- VAK：V=${maskScore(vak.V)} A=${maskScore(vak.Au)} K=${maskScore(vak.K)}`);

  const attach = maskScoreMap(
    s.normalized.attach as Record<string, number>,
    Object.keys(s.normalized.attach),
  );
  lines.push(`- アタッチメント：${attach}`);

  const love = maskScoreMap(
    s.normalized.love as Record<string, number>,
    Object.keys(s.normalized.love),
  );
  lines.push(`- 愛情表現：${love}`);

  const entre = maskScoreMap(
    s.normalized.entre as Record<string, number>,
    Object.keys(s.normalized.entre),
  );
  lines.push(`- 起業家タイプ：${entre}`);

  // トップタイプ
  const t = s.topTypes;
  lines.push('');
  lines.push('## 判定済トップタイプ');
  lines.push(`- 16タイプ性格（独自命名）：${t.big5DerivedType.label} (${t.big5DerivedType.code})`);
  lines.push(`- MBTI互換軸：${t.mbti.type}`);
  lines.push(`- エニアグラム：${t.ennea.expression}（${t.ennea.main.name}）`);
  lines.push(`- 起業家：メイン=${t.entre.main.name} / サブ=${t.entre.sub.name}`);
  lines.push(
    `- RIASECトップ3：${t.riasecTop3.map((r) => `${r.code}(${r.name})`).join(' / ')}`,
  );
  lines.push(`- VAKトップ：${t.vakTop.code}（${t.vakTop.name}）`);
  lines.push(`- アタッチメント：${t.attachTop.code}（${t.attachTop.name}）`);
  lines.push(`- 愛情表現トップ：${t.loveTop.code}（${t.loveTop.name}）`);

  return lines.join('\n');
}

function userBlock(u: UserProfile): string {
  const lines: string[] = [];
  lines.push('## ユーザー基本情報');
  lines.push(`- 氏名：${fmt(u.fullName)}`);
  lines.push(`- 生年月日：${fmt(u.birthDate)}`);
  lines.push(`- 生まれ時刻：${fmt(u.birthTime)}`);
  lines.push(`- 出生地：${fmt(u.birthPlaceName)}`);
  lines.push(`- 関係性タグ：${fmt(u.relationshipTag)}`);
  return lines.join('\n');
}

function narrativeBlock(n: NarrativeBundle): string {
  const lines: string[] = [];
  lines.push('## 本人の自由記述');
  const map: { key: keyof NarrativeBundle; label: string }[] = [
    { key: 'Q31', label: 'Q31 夢中体験' },
    { key: 'Q32', label: 'Q32 怒り・違和感' },
    { key: 'Q33', label: 'Q33 無償でもやること' },
    { key: 'Q34', label: 'Q34 譲れない信念' },
    { key: 'Q35', label: 'Q35 褒められた強み' },
    { key: 'Q36', label: 'Q36 5年後の未来' },
    { key: 'Q37', label: 'Q37 真似したい人物・尊敬する人' },
    { key: 'Q38', label: 'Q38 最終自由記述：本人がAIに伝えたいこと' },
    { key: 'styleSample', label: '文体サンプル300字' },
    { key: 'ngExpressions', label: 'NG表現' },
  ];
  for (const { key, label } of map) {
    const v = n[key];
    if (!v) continue;
    lines.push(`### ${label}`);
    lines.push(v.trim());
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

/**
 * 章ユーザープロンプトの先頭に挿入する「共通コンテキスト」を組み立てる。
 * 13章で同一文字列を使い回し、cache_control: ephemeral を付与してキャッシュさせる。
 *
 * 出力例：
 *   # 共通コンテキスト
 *   ## ユーザー基本情報
 *   ...
 *   ## 命術16診断
 *   ...
 *   ## 心理スコア
 *   ...
 *   ## 本人の自由記述
 *   ...
 */
export function buildCelestialContext(ctx: ChapterContext): string {
  const blocks: string[] = [
    '# 共通コンテキスト',
    '',
    userBlock(ctx.user),
    '',
    celestialBlock(ctx.celestial),
    '',
    scoresBlock(ctx.scores),
    '',
    narrativeBlock(ctx.narrative),
  ];
  if (ctx.integrationTags && ctx.integrationTags.length > 0) {
    blocks.push('');
    blocks.push('## 統合タグ（1章で抽出済キーワード）');
    blocks.push(ctx.integrationTags.map((t) => `- ${t}`).join('\n'));
  }
  return blocks.join('\n');
}
