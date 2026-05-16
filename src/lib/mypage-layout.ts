// マイページ全員共通レイアウト設定
// dna_system_config.key = 'mypage_layout' の value(text) に JSON.stringify(MyPageLayout) を保存

export const MYPAGE_SECTION_KEYS = ['report', 'clone', 'share', 'referral', 'feedback', 'match', 'edit-narrative'] as const;
export type MyPageSectionKey = typeof MYPAGE_SECTION_KEYS[number];

export interface MyPageSection {
  key: MyPageSectionKey;
  visible: boolean;
  title: string;
}

export interface MyPageLayout {
  header: { label: string; subtitle: string };
  intro: { visible: boolean; title: string; body: string };
  announcement: { visible: boolean; title: string; body: string; linkUrl: string; linkText: string };
  sections: MyPageSection[];
  footer: { note: string };
}

export const DEFAULT_MYPAGE_LAYOUT: MyPageLayout = {
  header: {
    label: 'My Page',
    subtitle: 'DNA診断AI マイページ',
  },
  intro: {
    visible: true,
    title: 'このレポートの正しい活用法',
    body: 'この診断結果のPDFを、Claude Code などのAIエージェントに渡して「この情報を元に自分の分身AIを構築して、今後、自分の理想や目標が最短で実現されるようパートナーとして伴走してください」と伝えましょう。その瞬間からAIは、面白いほどあなたのことを理解してくれて、賢くなって、すべての話が通じやすくなります。',
  },
  announcement: {
    visible: false,
    title: '',
    body: '',
    linkUrl: '',
    linkText: '',
  },
  sections: [
    { key: 'report',   visible: true, title: 'DNA診断レポート' },
    { key: 'clone',    visible: true, title: '分身AIボット' },
    { key: 'share',    visible: true, title: '分身AIボットをシェアしてみませんか？' },
    { key: 'referral', visible: true, title: 'ご友人にもDNA診断を紹介してあげてください' },
    { key: 'feedback', visible: true, title: '診断レポート・分身AI・分身AIボットについての感想をお聞かせください' },
    { key: 'match',    visible: true, title: '相性診断履歴' },
    { key: 'edit-narrative', visible: true, title: '回答を編集・追記する' },
  ],
  footer: {
    note: '本レポートや分身AIボットのご利用については自己責任でお願いいたします。',
  },
};

/**
 * 受信した unknown を MyPageLayout 型に正規化（不足項目は default で補完）。
 * セクションの順序・表示有無・タイトルだけは保存値を尊重。
 */
export function normalizeLayout(raw: unknown): MyPageLayout {
  const def = DEFAULT_MYPAGE_LAYOUT;
  if (!raw || typeof raw !== 'object') return def;
  const r = raw as Record<string, unknown>;

  const header = (r.header && typeof r.header === 'object' ? r.header : {}) as Record<string, unknown>;
  const intro = (r.intro && typeof r.intro === 'object' ? r.intro : {}) as Record<string, unknown>;
  const ann = (r.announcement && typeof r.announcement === 'object' ? r.announcement : {}) as Record<string, unknown>;
  const footer = (r.footer && typeof r.footer === 'object' ? r.footer : {}) as Record<string, unknown>;

  // セクションは保存値を起点に、漏れキーは default 末尾に追加
  const savedSecs = Array.isArray(r.sections) ? (r.sections as unknown[]) : [];
  const validKeys = new Set(MYPAGE_SECTION_KEYS as readonly string[]);
  const seen = new Set<string>();
  const sections: MyPageSection[] = [];
  for (const s of savedSecs) {
    if (!s || typeof s !== 'object') continue;
    const obj = s as Record<string, unknown>;
    const k = String(obj.key ?? '');
    if (!validKeys.has(k) || seen.has(k)) continue;
    seen.add(k);
    sections.push({
      key: k as MyPageSectionKey,
      visible: obj.visible === false ? false : true,
      title: typeof obj.title === 'string' ? obj.title : (def.sections.find(d => d.key === k)?.title ?? k),
    });
  }
  for (const d of def.sections) {
    if (!seen.has(d.key)) sections.push({ ...d });
  }

  return {
    header: {
      label: typeof header.label === 'string' ? header.label : def.header.label,
      subtitle: typeof header.subtitle === 'string' ? header.subtitle : def.header.subtitle,
    },
    intro: {
      visible: intro.visible === false ? false : true,
      title: typeof intro.title === 'string' ? intro.title : def.intro.title,
      body: typeof intro.body === 'string' ? intro.body : def.intro.body,
    },
    announcement: {
      visible: ann.visible === true,
      title: typeof ann.title === 'string' ? ann.title : '',
      body: typeof ann.body === 'string' ? ann.body : '',
      linkUrl: typeof ann.linkUrl === 'string' ? ann.linkUrl : '',
      linkText: typeof ann.linkText === 'string' ? ann.linkText : '',
    },
    sections,
    footer: {
      note: typeof footer.note === 'string' ? footer.note : def.footer.note,
    },
  };
}

export function parseLayoutFromRow(value: string | null | undefined): MyPageLayout {
  if (!value) return DEFAULT_MYPAGE_LAYOUT;
  try {
    return normalizeLayout(JSON.parse(value));
  } catch {
    return DEFAULT_MYPAGE_LAYOUT;
  }
}
