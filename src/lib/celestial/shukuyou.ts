// 4. 宿曜占星術（lunar-typescript の Foto 内蔵27宿）
import { Solar, Foto } from 'lunar-typescript';
import type { ShukuyoResult, ParsedInput } from './types';

// 27宿のグループ分類（安・危・成・壊・友・親・業・栄の8種）
// ここでは簡易的に「安住・危急」「栄親」などのざっくり分類で表現
const XIU_GROUPS: Record<string, string> = {
  '昴': '命', '畢': '業', '觜': '胎', '参': '栄',
  '井': '友', '鬼': '衰', '柳': '安', '星': '危',
  '張': '成', '翼': '壊', '軫': '友', '角': '親',
  '亢': '業', '氐': '胎', '房': '栄', '心': '友',
  '尾': '衰', '箕': '安', '斗': '危', '女': '成',
  '虚': '壊', '危': '友', '室': '親', '壁': '業',
  '奎': '胎', '婁': '栄', '胃': '衰',
};

export function computeShukuyo(p: ParsedInput): ShukuyoResult {
  const solar = Solar.fromYmdHms(p.year, p.month, p.day, 12, 0, 0);
  const lunar = solar.getLunar();

  // lunar-typescriptの基本27宿 → getXiu() は二十八宿のため、Fotoから取得
  const foto = Foto.fromLunar(lunar);

  const xiu27: string = foto.getXiu();
  const xiuLuck: string = foto.getXiuLuck();
  const zheng: string = foto.getZheng();

  return {
    xiu27,
    xiuLuck,
    zheng,
    group: XIU_GROUPS[xiu27] ?? '不明',
  };
}
