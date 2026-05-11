// 15. 12支配星独自命名（0学回避命名）
// 0学の12タイプを完全独自命名で再構築
import type { ShihaiseiResult, ParsedInput } from './types';

const STARS: { name: string; archetype: string; shadow: string }[] = [
  { name: '紅蓮星', archetype: '情熱で道を切り拓くパイオニア', shadow: '怒りの暴走' },
  { name: '蒼穹星', archetype: '理知と直観のバランサー', shadow: '優柔不断' },
  { name: '黄金星', archetype: '富と再現性の制度設計者', shadow: '傲慢な物質主義' },
  { name: '翠玉星', archetype: '癒しと和解の橋渡し', shadow: '自己犠牲の依存' },
  { name: '銀河星', archetype: '夢と物語の演出家', shadow: '現実逃避' },
  { name: '紫電星', archetype: '常識を破壊する革命家', shadow: '攻撃性の暴走' },
  { name: '深淵星', archetype: '本質を貫く思索者', shadow: 'ニヒリズム' },
  { name: '黎明星', archetype: '始まりを告げるチャレンジャー', shadow: '途中放棄' },
  { name: '天頂星', archetype: '頂点を志向するリーダー', shadow: '権力欲' },
  { name: '常磐星', archetype: '不動の軸を持つ守護者', shadow: '頑迷な保守' },
  { name: '七彩星', archetype: '多面的に活躍するエンターテイナー', shadow: '一貫性の欠如' },
  { name: '幽玄星', archetype: '見えない世界を翻訳する巫', shadow: '社会との断絶' },
];

// 算出式（独自）：年+月+日 mod 12
export function computeShihaisei(p: ParsedInput): ShihaiseiResult {
  const sum = p.year + p.month + p.day;
  const number = (sum % 12);
  const star = STARS[number];

  return {
    number: number + 1,
    starName: star.name,
    archetype: star.archetype,
    shadowSide: star.shadow,
  };
}
