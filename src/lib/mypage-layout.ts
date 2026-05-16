// マイページ全員共通レイアウト設定
// dna_system_config.key = 'mypage_layout' の value(text) に JSON.stringify(MyPageLayout) を保存

export const MYPAGE_SECTION_KEYS = ['report', 'clone', 'share', 'referral', 'feedback', 'match', 'edit-narrative'] as const;
export type MyPageSectionKey = typeof MYPAGE_SECTION_KEYS[number];

export interface MyPageSection {
  key: MyPageSectionKey;
  visible: boolean;
  title: string;
  /** セクション内の細部テキスト（admin で編集可能）。キーはセクションごとに定義。 */
  fields: Record<string, string>;
}

export interface MyPageLayout {
  header: { label: string; subtitle: string };
  intro: { visible: boolean; title: string; body: string };
  announcement: { visible: boolean; title: string; body: string; linkUrl: string; linkText: string };
  sections: MyPageSection[];
  footer: { note: string };
}

/**
 * 各セクションの「内部フィールド」のデフォルト値。
 * admin で編集された fields は保存値が優先され、未設定キーはここから fallback。
 * 新しいフィールドを追加する場合は、ここに足してから me/[id] と admin UI で参照すること。
 */
export const DEFAULT_SECTION_FIELDS: Record<MyPageSectionKey, Record<string, string>> = {
  report: {
    description: '命術16・心理スコア・あなたの記述を統合した50ページ以上の統合レポート。',
    ctaLabel: 'PDFをダウンロード',
    pendingMessage: '生成中 — 完成まで残り数分です。完了したらこのページをリロードしてください。',
  },
  clone: {
    diffHeading: 'ChatGPT との違い',
    diffBody: '汎用 AI は誰の壁打ち相手にもなれるが、あなた自身のことは知らない。この分身 AI は、あなたが書いた自由記述8問・命術16・心理スコア・文体サンプルを内面化し、「あなたの言葉・価値観・落とし穴」を起点に応答する。同じ質問でも、返ってくる答えが違う。',
    howToHeading: '分身ボットの使い方',
    step1Title: '１ ご自身をさらに深掘りする',
    step1Body: 'あなたがまだ気づいていないあなた自身のことを探求してみてください。',
    step2Title: '２ 仕事仲間やチームに共有する',
    step2Body: '自分の取り扱い方を知ってもらえることで、より深い関係性を築くことができます。',
    step3Title: '３ パートナーやご友人と共有する',
    step3Body: '今まで以上に自分の深層を理解してもらうことで、より濃い付き合いができます。',
    ctaLabel: '分身AIに話しかける',
    displayNameLabel: '公開時の表示名（本名を出したくない時）',
    savedMessage: '保存しました（分身AIページのタイトルに反映）',
    lockedMessage: 'レポート完成後に有効化されます。',
  },
  share: {
    body1: '仕事の仲間・友人や家族に、分身AIのURLを渡して、自分のことをもっと知ってもらいましょう。自分の正体を知ってもらうことで、お互いの特性がわかり、さらに関係性を構築しやすくなります。',
    body2: 'パートナー関係においても、お互いが直接聞きづらいことも分身AIボットに確認できてしまうため、高い効果を発揮します。',
    body3: '相手も診断をやれば双方の相性も見ることができます。',
    securityNote: '※レポート本体は本人だけが閲覧可能で、シェアできるのは「あなたの分身AIへのリンク」のみです。',
    shareLeadText: '分身AIのリンクを友人・仲間・家族に渡す',
    shareMessage: '私({name})の分身AIです。話しかけてみてください。',
  },
  referral: {
    body: 'DNA診断は、Claude Codeが飛躍的に賢くなる分身AIを、1人でも多くの方に活用していただきたくて、無料で公開しています。診断レポートでClaudeCodeが賢くなったり、分身AIボットがお役に立てた場合には、是非このDNA診断を、ご友人の経営者にも伝えてあげてください。',
    shareMessage: 'DNA診断AIで、自分の分身AIを作る診断を受けた。ClaudeCodeが飛躍的に賢くなるのでおすすめ。',
  },
  feedback: {
    placeholder: '診断レポート・分身AI・分身AIボットの使い心地、気づいたこと、改善のご提案など、何でもお気軽にどうぞ。',
    submitLabel: '送信する',
    sentThanks: '貴重なご意見ありがとうございます。\n今後の開発に活かさせていただきます。',
    giftPrefix: 'お礼として',
    giftHighlight: '「ClaudeCode初心者が初日に設定すべき7つの神設定」',
    giftSuffix: 'をプレゼントさせていただきます。',
    giftButtonLabel: 'プレゼントを受け取る',
    giftUrl: 'https://bit.ly/tips7',
    giftPostText: 'ご活用いただきClaudeCodeをより使いこなしていただけたら嬉しいです。\n次回の神プロダクトのご案内もお楽しみに。',
    replyAgainLabel: '再投稿する',
  },
  match: {},
  'edit-narrative': {},
};

/** セクションキーからデフォルト fields のコピーを返す（不変参照を避けるためspread） */
function defaultFieldsOf(key: MyPageSectionKey): Record<string, string> {
  return { ...(DEFAULT_SECTION_FIELDS[key] ?? {}) };
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
    { key: 'report',         visible: true, title: 'DNA診断レポート',                                       fields: defaultFieldsOf('report') },
    { key: 'clone',          visible: true, title: '分身AIボット',                                          fields: defaultFieldsOf('clone') },
    { key: 'share',          visible: true, title: '分身AIボットをシェアしてみませんか？',                  fields: defaultFieldsOf('share') },
    { key: 'referral',       visible: true, title: 'ご友人にもDNA診断を紹介してあげてください',             fields: defaultFieldsOf('referral') },
    { key: 'feedback',       visible: true, title: '診断レポート・分身AI・分身AIボットについての感想をお聞かせください', fields: defaultFieldsOf('feedback') },
    { key: 'match',          visible: true, title: '相性診断履歴',                                          fields: defaultFieldsOf('match') },
    { key: 'edit-narrative', visible: true, title: '回答を編集・追記する',                                  fields: defaultFieldsOf('edit-narrative') },
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
    const sectionKey = k as MyPageSectionKey;
    // fields: default を起点に、保存値で string のみ上書き（不正型は無視）
    const defFields = defaultFieldsOf(sectionKey);
    const savedFields = (obj.fields && typeof obj.fields === 'object' ? obj.fields : {}) as Record<string, unknown>;
    const mergedFields: Record<string, string> = { ...defFields };
    for (const [fk, fv] of Object.entries(savedFields)) {
      if (typeof fv === 'string') mergedFields[fk] = fv;
    }
    sections.push({
      key: sectionKey,
      visible: obj.visible === false ? false : true,
      title: typeof obj.title === 'string' ? obj.title : (def.sections.find(d => d.key === sectionKey)?.title ?? k),
      fields: mergedFields,
    });
  }
  for (const d of def.sections) {
    if (!seen.has(d.key)) sections.push({ ...d, fields: { ...d.fields } });
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
