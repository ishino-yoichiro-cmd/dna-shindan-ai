// 多軸選択質問26問 + ナラティブ7問 = 33問
// questions_v1.md の Q5〜Q37 を完全データ化
// スコア配分は同マークダウン内のテーブルに準拠

// ===== 軸IDの型定義 =====

export type Big5Axis = 'E' | 'A' | 'C' | 'N' | 'O';
export type MbtiAxis = 'EI' | 'SN' | 'TF' | 'JP';
// MBTI delta: '+' は EorSorTorJ 寄り、'-' は IorNorForP 寄り
export type MbtiDirection = 'E' | 'I' | 'S' | 'N' | 'T' | 'F' | 'J' | 'P' | 'neutral';
export type EnneaAxis =
  | 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9';
export type RiasecAxis = 'R' | 'I' | 'A' | 'S' | 'EE' | 'Co';
export type VakAxis = 'V' | 'Au' | 'K';
export type AttachAxis = 'At-Sec' | 'At-Av' | 'At-Anx' | 'At-Fea';
export type LoveAxis = 'L-Time' | 'L-Word' | 'L-Touch' | 'L-Gift' | 'L-Act';
export type EntreAxis =
  | 'EnT1' | 'EnT2' | 'EnT3' | 'EnT4' | 'EnT5' | 'EnT6' | 'EnT7' | 'EnT8';

// ===== ScoreDelta 型 =====
// 1選択肢分のスコア加算量
export interface ScoreDelta {
  big5?: Partial<Record<Big5Axis, number>>;
  // MBTI: 各軸につき方向と量を持つ。'+' = E/S/T/J 寄り、'-' = I/N/F/P 寄り
  mbti?: Partial<Record<MbtiAxis, { dir: MbtiDirection; amount: number }>>;
  ennea?: Partial<Record<EnneaAxis, number>>;
  riasec?: Partial<Record<RiasecAxis, number>>;
  vak?: Partial<Record<VakAxis, number>>;
  attach?: Partial<Record<AttachAxis, number>>;
  love?: Partial<Record<LoveAxis, number>>;
  entre?: Partial<Record<EntreAxis, number>>;
}

// ===== 質問型 =====

export interface SelectChoice {
  id: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  text: string;
  delta: ScoreDelta;
}

export interface SelectQuestion {
  id: string; // 'Q5' 〜 'Q30'
  type: 'select';
  title: string;
  prompt: string;
  choices: SelectChoice[];
}

export interface NarrativeSample {
  persona: string; // 'デザイナー・30代女性' 等
  text: string;
}

export interface NarrativeQuestion {
  id: string; // 'Q31' 〜 'Q37'
  type: 'narrative';
  title: string;
  prompt: string;
  guide: string[];
  samples: NarrativeSample[];
  extracts: string[]; // 抽出される情報リスト
}

export type Question = SelectQuestion | NarrativeQuestion;

// ===== ヘルパー =====
const m = (dir: MbtiDirection, amount = 1) => ({ dir, amount });

// ===== 多軸選択質問（Q5〜Q30） =====

export const SELECT_QUESTIONS: SelectQuestion[] = [
  // ---------- Q5 ----------
  {
    id: 'Q5',
    type: 'select',
    title: '休日の過ごし方として、いちばんしっくりくるのは？',
    prompt: 'ぽっかり空いた休日、何も予定がない。あなたが「あー今日はこれだな」って自然に選ぶ過ごし方は？',
    choices: [
      {
        id: 'A',
        text: '友達数人と急に集まって、ワイワイ飲んだりカフェ巡り',
        delta: {
          big5: { E: 2, A: 1 },
          mbti: { EI: m('E'), SN: m('S') },
          ennea: { E7: 1, E2: 1 },
          riasec: { S: 1, EE: 1 },
          vak: { Au: 1 },
          attach: { 'At-Sec': 1 },
          love: { 'L-Time': 1 },
          entre: { EnT2: 1 },
        },
      },
      {
        id: 'B',
        text: '一人で本やNetflixに没頭して、誰とも話さず充電',
        delta: {
          big5: { E: -2, O: 1 },
          mbti: { EI: m('I'), SN: m('N') },
          ennea: { E5: 1, E4: 1 },
          riasec: { I: 1 },
          vak: { V: 1 },
          attach: { 'At-Av': 1 },
          love: { 'L-Time': 1 },
          entre: { EnT6: 1 },
        },
      },
      {
        id: 'C',
        text: '前から気になってた展示・ライブ・新しい街を散策',
        delta: {
          big5: { O: 2, E: 1 },
          mbti: { EI: m('E'), SN: m('N') },
          ennea: { E7: 1, E4: 1 },
          riasec: { A: 1 },
          vak: { V: 1 },
          attach: { 'At-Sec': 1 },
          love: { 'L-Time': 1 },
          entre: { EnT1: 1 },
        },
      },
      {
        id: 'D',
        text: '部屋を片付けたり、溜まってた手続きを一気に終わらせる',
        delta: {
          big5: { C: 2, N: -1 },
          mbti: { JP: m('J'), SN: m('S') },
          ennea: { E1: 1, E6: 1 },
          riasec: { Co: 1, R: 1 },
          vak: { K: 1 },
          attach: { 'At-Sec': 1 },
          love: { 'L-Act': 1 },
          entre: { EnT7: 1 },
        },
      },
    ],
  },

  // ---------- Q6 ----------
  {
    id: 'Q6',
    type: 'select',
    title: '友達とレストランを選ぶとき、あなたの動き方は？',
    prompt: '5人で集まる飲み会、店決め担当が「誰でもいいから決めて〜」と投げてきた。あなたはどうする？',
    choices: [
      {
        id: 'A',
        text: '全員のアレルギーや好み聞いて、3案出してみんなに投票してもらう',
        delta: {
          big5: { A: 2, C: 1 },
          mbti: { TF: m('F'), JP: m('J') },
          ennea: { E2: 1, E9: 1 },
          riasec: { S: 1, Co: 1 },
          vak: { Au: 1 },
          love: { 'L-Time': 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'B',
        text: 'ピンと来た一軒に「ここ行こう」と即決して送る',
        delta: {
          big5: { E: 1, O: 1 },
          mbti: { JP: m('P'), TF: m('T') },
          ennea: { E8: 1, E3: 1 },
          riasec: { EE: 1 },
          vak: { K: 1 },
          love: { 'L-Act': 1 },
          entre: { EnT4: 1 },
        },
      },
      {
        id: 'C',
        text: '食べログとInstagramを2時間調べて、最高評価の店を提案',
        delta: {
          big5: { C: 2, O: 1 },
          mbti: { SN: m('N'), JP: m('J') },
          ennea: { E1: 1, E5: 1 },
          riasec: { I: 1, Co: 1 },
          vak: { V: 1 },
          love: { 'L-Gift': 1 },
          entre: { EnT6: 1 },
        },
      },
      {
        id: 'D',
        text: '「店どこでもいいから日程だけ早く決めようよ」と話を進める',
        delta: {
          big5: { C: 1, A: -1 },
          mbti: { TF: m('T'), JP: m('J') },
          ennea: { E8: 1, E3: 1 },
          riasec: { EE: 1 },
          vak: { K: 1 },
          love: { 'L-Act': 1 },
          entre: { EnT8: 1 },
        },
      },
    ],
  },

  // ---------- Q7 ----------
  {
    id: 'Q7',
    type: 'select',
    title: '新しい家電を買うとき、何で選ぶ？',
    prompt: '新しい掃除機を買おうとしてる。決め手は？',
    choices: [
      {
        id: 'A',
        text: 'デザイン。部屋に置いて美しいものじゃないと無理',
        delta: {
          big5: { O: 2 },
          mbti: { SN: m('N'), TF: m('F') },
          ennea: { E4: 1, E3: 1 },
          riasec: { A: 1 },
          vak: { V: 1 },
          entre: { EnT1: 1 },
        },
      },
      {
        id: 'B',
        text: 'レビューと比較表を全部読んで、コスパ最強の一台',
        delta: {
          big5: { C: 2, O: 1 },
          mbti: { SN: m('N'), TF: m('T') },
          ennea: { E5: 1, E1: 1 },
          riasec: { I: 1, Co: 1 },
          vak: { V: 1 },
          entre: { EnT6: 1 },
        },
      },
      {
        id: 'C',
        text: '友達が「最高」と言ってたやつをそのまま買う',
        delta: {
          big5: { A: 1, E: 1 },
          mbti: { SN: m('S'), TF: m('F') },
          ennea: { E9: 1, E6: 1 },
          riasec: { S: 1 },
          vak: { Au: 1 },
          entre: { EnT2: 1 },
        },
      },
      {
        id: 'D',
        text: '店頭で実物を触って、握り心地で決める',
        delta: {
          big5: { O: -1, C: 1 },
          mbti: { SN: m('S') },
          ennea: { E8: 1, E6: 1 },
          riasec: { R: 1 },
          vak: { K: 1 },
          entre: { EnT3: 1 },
        },
      },
    ],
  },

  // ---------- Q8 ----------
  {
    id: 'Q8',
    type: 'select',
    title: 'チームの飲み会で、あなたが座るのは？',
    prompt: '10人の飲み会、席が決まってない。あなたが自然に座るのは？',
    choices: [
      {
        id: 'A',
        text: '真ん中。誰とでも話せる席が居心地いい',
        delta: {
          big5: { E: 2 },
          mbti: { EI: m('E') },
          ennea: { E7: 1, E3: 1 },
          riasec: { S: 1, EE: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT2: 1, EnT4: 1 },
        },
      },
      {
        id: 'B',
        text: '端っこ。話したい人と深く話せる位置',
        delta: {
          big5: { E: -1, O: 1 },
          mbti: { EI: m('I') },
          ennea: { E4: 1, E5: 1 },
          riasec: { I: 1, A: 1 },
          attach: { 'At-Av': 1 },
          entre: { EnT6: 1 },
        },
      },
      {
        id: 'C',
        text: '幹事の隣。場をうまく回す側に回りたい',
        delta: {
          big5: { E: 1, C: 1 },
          mbti: { TF: m('T'), JP: m('J') },
          ennea: { E2: 1, E8: 1 },
          riasec: { EE: 1, S: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT7: 1, EnT8: 1 },
        },
      },
      {
        id: 'D',
        text: 'どこでもいい。誰かが指定してくれたらそこ',
        delta: {
          big5: { E: -1, A: 1 },
          mbti: { JP: m('P') },
          ennea: { E9: 1, E6: 1 },
          riasec: { Co: 1 },
          attach: { 'At-Anx': 1 },
          entre: { EnT5: 1 },
        },
      },
    ],
  },

  // ---------- Q9 ----------
  {
    id: 'Q9',
    type: 'select',
    title: '仕事で新しいタスクを任されたとき、最初にやることは？',
    prompt: '上司から「これやっといて」とフワッと振られた新しいタスク。あなたが最初に手をつけるのは？',
    choices: [
      {
        id: 'A',
        text: 'ゴールと締切と評価基準を明確にする',
        delta: {
          big5: { C: 2 },
          mbti: { TF: m('T'), JP: m('J') },
          ennea: { E1: 1, E3: 1 },
          riasec: { EE: 1, Co: 1 },
          vak: { V: 1 },
          entre: { EnT8: 1, EnT7: 1 },
        },
      },
      {
        id: 'B',
        text: 'ググって類似事例とテンプレートを探す',
        delta: {
          big5: { O: 1, C: 1 },
          mbti: { SN: m('N') },
          ennea: { E5: 1, E6: 1 },
          riasec: { I: 1, Co: 1 },
          vak: { V: 1 },
          entre: { EnT6: 1 },
        },
      },
      {
        id: 'C',
        text: '過去にやった人に話を聞きに行く',
        delta: {
          big5: { E: 1, A: 1 },
          mbti: { EI: m('E'), TF: m('F') },
          ennea: { E2: 1, E6: 1 },
          riasec: { S: 1 },
          vak: { Au: 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'D',
        text: 'とりあえず手を動かして、分からなくなったら考える',
        delta: {
          big5: { O: 1, C: -1 },
          mbti: { JP: m('P') },
          ennea: { E7: 1, E8: 1 },
          riasec: { R: 1, EE: 1 },
          vak: { K: 1 },
          entre: { EnT4: 1, EnT1: 1 },
        },
      },
    ],
  },

  // ---------- Q10 ----------
  {
    id: 'Q10',
    type: 'select',
    title: '説明書がついた家具を組み立てるとき',
    prompt: '大きな家具が届いた。説明書もある。あなたはどうする？',
    choices: [
      {
        id: 'A',
        text: '説明書を最初から最後まで一読してから始める',
        delta: {
          big5: { C: 2 },
          mbti: { SN: m('S'), JP: m('J') },
          riasec: { Co: 1, R: 1 },
          vak: { V: 1 },
          ennea: { E1: 1, E6: 1 },
          entre: { EnT3: 1, EnT7: 1 },
        },
      },
      {
        id: 'B',
        text: '全パーツを並べて、写真と見比べながら直感で組む',
        delta: {
          big5: { O: 2 },
          mbti: { SN: m('N'), TF: m('T') },
          riasec: { A: 1, R: 1 },
          vak: { K: 1 },
          ennea: { E4: 1, E7: 1 },
          entre: { EnT1: 1 },
        },
      },
      {
        id: 'C',
        text: 'YouTubeで「組み立て動画」を探して見ながら作る',
        delta: {
          big5: { O: 1, A: 1 },
          mbti: { SN: m('S') },
          riasec: { I: 1 },
          vak: { V: 1, Au: 1 },
          ennea: { E5: 1, E6: 1 },
          entre: { EnT3: 1 },
        },
      },
      {
        id: 'D',
        text: '説明書チラ見しつつ、半分は勘で組み始める',
        delta: {
          big5: { O: 1, C: -1 },
          mbti: { JP: m('P'), SN: m('N') },
          riasec: { EE: 1 },
          vak: { K: 1 },
          ennea: { E7: 1, E8: 1 },
          entre: { EnT4: 1 },
        },
      },
    ],
  },

  // ---------- Q11 ----------
  {
    id: 'Q11',
    type: 'select',
    title: 'ストレスがピークの夜、あなたの回復法は？',
    prompt: '一日ヘトヘトに疲れた夜。明日も普通に動くために、どう回復する？',
    choices: [
      {
        id: 'A',
        text: '友達に電話して2時間しゃべる',
        delta: {
          big5: { E: 2, A: 1 },
          mbti: { EI: m('E') },
          ennea: { E2: 1, E7: 1 },
          vak: { Au: 1 },
          attach: { 'At-Anx': 1, 'At-Sec': 1 },
          love: { 'L-Time': 1, 'L-Word': 1 },
          entre: { EnT2: 1 },
        },
      },
      {
        id: 'B',
        text: 'お風呂に長く浸かって、ストレッチして寝る',
        delta: {
          big5: { N: -1 },
          mbti: { SN: m('S') },
          ennea: { E9: 1, E6: 1 },
          vak: { K: 1 },
          attach: { 'At-Sec': 1 },
          love: { 'L-Touch': 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'C',
        text: '好きな音楽・映画・本に没入する',
        delta: {
          big5: { O: 2, E: -1 },
          mbti: { EI: m('I'), SN: m('N') },
          ennea: { E4: 1, E5: 1 },
          vak: { V: 1, Au: 1 },
          attach: { 'At-Av': 1 },
          love: { 'L-Time': 1 },
          entre: { EnT1: 1 },
        },
      },
      {
        id: 'D',
        text: 'ノートに今の気持ちを書きなぐる',
        delta: {
          big5: { O: 1, N: 1 },
          mbti: { EI: m('I'), TF: m('F') },
          ennea: { E4: 1, E1: 1 },
          vak: { V: 1 },
          attach: { 'At-Anx': 1 },
          love: { 'L-Word': 1 },
          entre: { EnT6: 1 },
        },
      },
    ],
  },

  // ---------- Q12 ----------
  {
    id: 'Q12',
    type: 'select',
    title: '上司から長文のフィードバックメールが来た',
    prompt: '上司から「今回のプロジェクトについて」と件名の長文メールが届いた。読み始めた瞬間、あなたが感じるのは？',
    choices: [
      {
        id: 'A',
        text: 'ワクワクする。改善ポイント全部知りたい',
        delta: {
          big5: { C: 1, N: -2, O: 1 },
          ennea: { E1: 1, E3: 1 },
          attach: { 'At-Sec': 1 },
          mbti: { TF: m('T') },
          entre: { EnT8: 1, EnT3: 1 },
        },
      },
      {
        id: 'B',
        text: 'ちょっと身構える。でも読んで成長したい',
        delta: {
          big5: { C: 1, A: 1 },
          ennea: { E1: 1, E6: 1 },
          attach: { 'At-Sec': 1 },
          mbti: { TF: m('F') },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'C',
        text: 'ドキッとする。何か悪いこと書かれてないか確認したくなる',
        delta: {
          big5: { N: 2 },
          ennea: { E6: 1, E4: 1 },
          attach: { 'At-Anx': 1, 'At-Fea': 1 },
          mbti: { TF: m('F') },
          entre: { EnT6: 1 },
        },
      },
      {
        id: 'D',
        text: '後回し。タイミング見て読む',
        delta: {
          big5: { C: -1, N: -1 },
          ennea: { E7: 1, E9: 1 },
          attach: { 'At-Av': 1 },
          mbti: { JP: m('P') },
          entre: { EnT4: 1 },
        },
      },
    ],
  },

  // ---------- Q13 ----------
  {
    id: 'Q13',
    type: 'select',
    title: '大切な人を喜ばせる、あなたの自然なやり方は？',
    prompt: '大切な人の誕生日。「何かしてあげたい」と思ったとき、あなたが自然に選ぶアクションは？',
    choices: [
      {
        id: 'A',
        text: '一緒に過ごす一日をプランニングする',
        delta: {
          big5: { E: 1, A: 1 },
          love: { 'L-Time': 1 },
          ennea: { E2: 1, E9: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'B',
        text: '手紙やメッセージで気持ちを言葉にする',
        delta: {
          big5: { O: 1, A: 1 },
          love: { 'L-Word': 1 },
          ennea: { E4: 1, E2: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT1: 1 },
        },
      },
      {
        id: 'C',
        text: 'ハグしたり、手をつないだり、近くにいる',
        delta: {
          big5: { A: 1, E: 1 },
          love: { 'L-Touch': 1 },
          ennea: { E2: 1, E9: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'D',
        text: 'その人が欲しがってたものをサプライズでプレゼント',
        delta: {
          big5: { C: 1, A: 1 },
          love: { 'L-Gift': 1 },
          ennea: { E3: 1, E2: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT2: 1 },
        },
      },
      {
        id: 'E',
        text: '普段その人がやってる家事や雑務を全部代わりにやる',
        delta: {
          big5: { C: 2, A: 2 },
          love: { 'L-Act': 1 },
          ennea: { E1: 1, E2: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT7: 1 },
        },
      },
    ],
  },

  // ---------- Q14 ----------
  {
    id: 'Q14',
    type: 'select',
    title: '朝起きてまず一番に何をする？',
    prompt: '普通の朝、目が覚めて最初の30分。どう過ごしてる？',
    choices: [
      {
        id: 'A',
        text: 'すぐスマホでニュース・SNS・メールチェック',
        delta: {
          big5: { E: 1, O: 1 },
          mbti: { SN: m('N') },
          ennea: { E7: 1, E5: 1 },
          vak: { V: 1 },
          entre: { EnT2: 1 },
        },
      },
      {
        id: 'B',
        text: 'コーヒー淹れながら、今日のタスクを頭の中で整理',
        delta: {
          big5: { C: 2 },
          mbti: { JP: m('J') },
          ennea: { E1: 1, E3: 1 },
          vak: { V: 1 },
          entre: { EnT7: 1, EnT8: 1 },
        },
      },
      {
        id: 'C',
        text: 'ストレッチや散歩で身体を起こす',
        delta: {
          big5: { C: 1, N: -1 },
          mbti: { SN: m('S') },
          ennea: { E6: 1, E9: 1 },
          vak: { K: 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'D',
        text: 'ゆっくりベッドで二度寝・うとうと',
        delta: {
          big5: { C: -1, N: 1 },
          mbti: { JP: m('P') },
          ennea: { E9: 1, E4: 1 },
          vak: { K: 1 },
          entre: { EnT4: 1 },
        },
      },
    ],
  },

  // ---------- Q15 ----------
  {
    id: 'Q15',
    type: 'select',
    title: '学生時代、あなたが得意だった科目は？',
    prompt: '学生のころ、テストで「これは苦じゃない」と思えた科目は？（複数あったら一番手応えあったやつ）',
    choices: [
      {
        id: 'A',
        text: '数学・物理。論理が積み上がる感覚が好きだった',
        delta: {
          big5: { C: 1, O: 1 },
          mbti: { TF: m('T') },
          riasec: { I: 1 },
          vak: { V: 1 },
          entre: { EnT3: 1, EnT6: 1 },
        },
      },
      {
        id: 'B',
        text: '国語・英語。言葉の裏のニュアンスを掴むのが楽しかった',
        delta: {
          big5: { O: 2, A: 1 },
          mbti: { TF: m('F'), SN: m('N') },
          riasec: { A: 1, S: 1 },
          vak: { Au: 1 },
          entre: { EnT1: 1, EnT2: 1 },
        },
      },
      {
        id: 'C',
        text: '美術・音楽・体育。身体や感性で表現する科目',
        delta: {
          big5: { O: 2, E: 1 },
          mbti: { SN: m('S') },
          riasec: { A: 1 },
          vak: { K: 1 },
          entre: { EnT1: 1, EnT4: 1 },
        },
      },
      {
        id: 'D',
        text: '社会・歴史。人間ドラマと因果関係が面白かった',
        delta: {
          big5: { O: 1, A: 1 },
          mbti: { TF: m('F') },
          riasec: { S: 1, EE: 1 },
          vak: { Au: 1, V: 1 },
          entre: { EnT2: 1, EnT8: 1 },
        },
      },
      {
        id: 'E',
        text: '実験・実習・調理。手を動かして結果が出るやつ',
        delta: {
          big5: { C: 1, E: 1 },
          mbti: { SN: m('S') },
          riasec: { R: 1, I: 1 },
          vak: { K: 1 },
          entre: { EnT3: 1 },
        },
      },
    ],
  },

  // ---------- Q16 ----------
  {
    id: 'Q16',
    type: 'select',
    title: '旅行を計画するとき、あなたのやり方は？',
    prompt: '友達と3泊4日の海外旅行を計画してる。担当はあなた。どう進める？',
    choices: [
      {
        id: 'A',
        text: 'スプシで時間割と予算とルートを完璧に組む',
        delta: {
          big5: { C: 2, O: 1 },
          mbti: { JP: m('J') },
          ennea: { E1: 1, E3: 1, E6: 1 },
          riasec: { Co: 1, EE: 1 },
          entre: { EnT7: 1, EnT8: 1 },
        },
      },
      {
        id: 'B',
        text: '行きたい場所だけリストアップ、現地でその日の気分で',
        delta: {
          big5: { O: 2, C: -1 },
          mbti: { JP: m('P'), SN: m('N') },
          ennea: { E7: 1, E4: 1 },
          riasec: { A: 1 },
          entre: { EnT1: 1, EnT4: 1 },
        },
      },
      {
        id: 'C',
        text: '旅した人のブログを読み漁って、王道ルートを参考に',
        delta: {
          big5: { C: 1, A: 1 },
          mbti: { SN: m('S'), JP: m('J') },
          ennea: { E6: 1, E1: 1 },
          riasec: { Co: 1 },
          entre: { EnT3: 1 },
        },
      },
      {
        id: 'D',
        text: '「ホテルだけ取って、あとは適当でしょ」と任せる側に回る',
        delta: {
          big5: { E: -1, A: 1 },
          mbti: { JP: m('P') },
          ennea: { E9: 1, E5: 1 },
          entre: { EnT5: 1 },
        },
      },
    ],
  },

  // ---------- Q17 ----------
  {
    id: 'Q17',
    type: 'select',
    title: '議論で意見が割れたとき、あなたは？',
    prompt: 'チームミーティング、Aさんと意見が真っ向対立。会議室の空気が凍ってる。あなたはどうする？',
    choices: [
      {
        id: 'A',
        text: 'データと論理で、相手の論を丁寧に崩す',
        delta: {
          big5: { C: 1, A: -1 },
          mbti: { TF: m('T') },
          ennea: { E8: 1, E1: 1, E5: 1 },
          riasec: { I: 1, EE: 1 },
          entre: { EnT8: 1, EnT6: 1 },
        },
      },
      {
        id: 'B',
        text: '「両方の意見、いいとこあるよね」と統合案を出す',
        delta: {
          big5: { A: 2, O: 1 },
          mbti: { TF: m('F'), JP: m('P') },
          ennea: { E9: 1, E2: 1 },
          riasec: { S: 1 },
          entre: { EnT5: 1, EnT7: 1 },
        },
      },
      {
        id: 'C',
        text: '黙って観察して、後から個別に意見を伝える',
        delta: {
          big5: { E: -1, O: 1 },
          mbti: { EI: m('I') },
          ennea: { E5: 1, E4: 1, E9: 1 },
          riasec: { I: 1 },
          entre: { EnT6: 1 },
        },
      },
      {
        id: 'D',
        text: '「とりあえず一回試してみよう」と実行に倒す',
        delta: {
          big5: { C: 1, E: 1 },
          mbti: { JP: m('P'), SN: m('S') },
          ennea: { E3: 1, E7: 1, E8: 1 },
          riasec: { EE: 1, R: 1 },
          entre: { EnT4: 1, EnT3: 1 },
        },
      },
    ],
  },

  // ---------- Q18 ----------
  {
    id: 'Q18',
    type: 'select',
    title: 'あなたが許せないのは、どんな人？',
    prompt: '一緒に過ごしてて「この人とは合わない」と心がはっきり閉じる瞬間。それはどんな相手？',
    choices: [
      {
        id: 'A',
        text: '約束を平気で破る、時間にルーズな人',
        delta: {
          big5: { C: 2, A: -1 },
          ennea: { E1: 1, E3: 1, E6: 1 },
          riasec: { Co: 1 },
          entre: { EnT3: 1, EnT7: 1 },
        },
      },
      {
        id: 'B',
        text: '表面的で、本音を見せない人',
        delta: {
          big5: { O: 1, A: 1 },
          ennea: { E4: 1, E2: 1, E5: 1 },
          riasec: { A: 1, S: 1 },
          entre: { EnT1: 1 },
        },
      },
      {
        id: 'C',
        text: '弱い立場の人を見下す人',
        delta: {
          big5: { A: 2, N: 1 },
          ennea: { E2: 1, E1: 1, E8: 1 },
          riasec: { S: 1 },
          entre: { EnT5: 1, EnT8: 1 },
        },
      },
      {
        id: 'D',
        text: '自分の枠から出られない、変化を拒む人',
        delta: {
          big5: { O: 2, A: -1 },
          ennea: { E7: 1, E4: 1 },
          riasec: { A: 1, EE: 1 },
          entre: { EnT1: 1, EnT4: 1 },
        },
      },
    ],
  },

  // ---------- Q19 ----------
  {
    id: 'Q19',
    type: 'select',
    title: '自分の「成功」を一言で表すなら？',
    prompt: '5年後、誰かに「人生うまくいってる？」と聞かれたとき、何を答えられたら満足？',
    choices: [
      {
        id: 'A',
        text: '「目標を達成して、社会的に認められてる」',
        delta: {
          big5: { C: 1, E: 1 },
          ennea: { E3: 1, E8: 1 },
          riasec: { EE: 1, Co: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT8: 1, EnT4: 1 },
        },
      },
      {
        id: 'B',
        text: '「自分らしさを表現して、好きなことで生きてる」',
        delta: {
          big5: { O: 2, E: 1 },
          ennea: { E4: 1, E7: 1 },
          riasec: { A: 1 },
          attach: { 'At-Av': 1 },
          entre: { EnT1: 1 },
        },
      },
      {
        id: 'C',
        text: '「信頼できる人に囲まれて、穏やかに過ごせてる」',
        delta: {
          big5: { A: 2, N: -1 },
          ennea: { E9: 1, E2: 1, E6: 1 },
          riasec: { S: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'D',
        text: '「世の中に意味あることを残せてる」',
        delta: {
          big5: { O: 1, C: 1 },
          ennea: { E1: 1, E5: 1 },
          riasec: { I: 1, S: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT6: 1, EnT8: 1 },
        },
      },
    ],
  },

  // ---------- Q20 ----------
  {
    id: 'Q20',
    type: 'select',
    title: '知らない街で道に迷った',
    prompt: '一人で旅行中、知らない街で完全に迷った。Wi-Fiも電波も微妙。どうする？',
    choices: [
      {
        id: 'A',
        text: '紙の地図か看板を必死に読み解く',
        delta: {
          big5: { C: 1, O: 1 },
          mbti: { SN: m('S') },
          riasec: { I: 1, Co: 1 },
          vak: { V: 1 },
          attach: { 'At-Av': 1 },
          entre: { EnT6: 1, EnT3: 1 },
        },
      },
      {
        id: 'B',
        text: '近くの人に話しかけて道を聞く',
        delta: {
          big5: { E: 2, A: 1 },
          mbti: { EI: m('E') },
          riasec: { S: 1 },
          vak: { Au: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT2: 1, EnT5: 1 },
        },
      },
      {
        id: 'C',
        text: 'とりあえず大通りに出るまで歩いて、感覚で方向を掴む',
        delta: {
          big5: { O: 1, N: -1 },
          mbti: { SN: m('N'), JP: m('P') },
          riasec: { R: 1 },
          vak: { K: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT1: 1, EnT4: 1 },
        },
      },
      {
        id: 'D',
        text: '落ち着いてカフェに入って、Wi-Fi借りてGoogleマップを開く',
        delta: {
          big5: { C: 2, N: -1 },
          mbti: { JP: m('J') },
          riasec: { Co: 1 },
          vak: { V: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT7: 1 },
        },
      },
    ],
  },

  // ---------- Q21 ----------
  {
    id: 'Q21',
    type: 'select',
    title: 'あなたが本気で怒るとき',
    prompt: '普段は穏やかなあなたが、内側から怒りで震えるのはどんなとき？',
    choices: [
      {
        id: 'A',
        text: '自分の大事な人が傷つけられたとき',
        delta: {
          big5: { A: 2 },
          ennea: { E2: 1, E6: 1 },
          attach: { 'At-Sec': 1, 'At-Anx': 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'B',
        text: '不正・嘘・裏切りを目撃したとき',
        delta: {
          big5: { C: 2, A: 1 },
          ennea: { E1: 1, E8: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT8: 1, EnT6: 1 },
        },
      },
      {
        id: 'C',
        text: '自分の領域や時間を一方的に侵されたとき',
        delta: {
          big5: { O: 1, A: -1 },
          ennea: { E5: 1, E4: 1, E9: 1 },
          attach: { 'At-Av': 1 },
          entre: { EnT6: 1, EnT1: 1 },
        },
      },
      {
        id: 'D',
        text: '自分のプライド・誇りを踏みにじられたとき',
        delta: {
          big5: { E: 1, N: 1 },
          ennea: { E3: 1, E8: 1, E4: 1 },
          attach: { 'At-Fea': 1 },
          entre: { EnT4: 1 },
        },
      },
    ],
  },

  // ---------- Q22 ----------
  {
    id: 'Q22',
    type: 'select',
    title: 'お金の使い方の傾向は？',
    prompt: '月末、口座にちょっと余裕がある。何に使う？',
    choices: [
      {
        id: 'A',
        text: '旅行・体験・ライブなど、思い出に残ること',
        delta: {
          big5: { O: 2, E: 1 },
          ennea: { E7: 1, E4: 1 },
          riasec: { A: 1, S: 1 },
          love: { 'L-Time': 1 },
          entre: { EnT1: 1, EnT4: 1 },
        },
      },
      {
        id: 'B',
        text: '服・コスメ・インテリアなど、見た目を整えるもの',
        delta: {
          big5: { O: 1, E: 1 },
          ennea: { E3: 1, E4: 1 },
          riasec: { A: 1 },
          love: { 'L-Gift': 1 },
          entre: { EnT1: 1, EnT4: 1 },
        },
      },
      {
        id: 'C',
        text: '本・講座・スキルアップなど、自分への投資',
        delta: {
          big5: { C: 1, O: 1 },
          ennea: { E1: 1, E5: 1, E3: 1 },
          riasec: { I: 1 },
          love: { 'L-Word': 1 },
          entre: { EnT6: 1, EnT8: 1 },
        },
      },
      {
        id: 'D',
        text: '投資・貯金。将来のために増やす方向に',
        delta: {
          big5: { C: 2, N: -1 },
          ennea: { E5: 1, E6: 1, E1: 1 },
          riasec: { Co: 1, EE: 1 },
          love: { 'L-Act': 1 },
          entre: { EnT6: 1, EnT8: 1 },
        },
      },
      {
        id: 'E',
        text: '大切な人へのプレゼントや一緒の時間',
        delta: {
          big5: { A: 2 },
          ennea: { E2: 1, E9: 1 },
          riasec: { S: 1 },
          love: { 'L-Gift': 1, 'L-Time': 1 },
          entre: { EnT5: 1, EnT2: 1 },
        },
      },
    ],
  },

  // ---------- Q23 ----------
  {
    id: 'Q23',
    type: 'select',
    title: '新しいスキルを学ぶときの好きなやり方は？',
    prompt: '全く新しい分野（例：プログラミングでも料理でも）を学ぶとき、いちばん吸収できるやり方は？',
    choices: [
      {
        id: 'A',
        text: '本や教科書をしっかり読んで体系から入る',
        delta: {
          big5: { C: 1, O: 1 },
          mbti: { SN: m('S'), JP: m('J') },
          riasec: { I: 1, Co: 1 },
          vak: { V: 1 },
          entre: { EnT6: 1 },
        },
      },
      {
        id: 'B',
        text: 'YouTubeや動画で実演を見ながら真似る',
        delta: {
          big5: { O: 1 },
          mbti: { SN: m('S') },
          riasec: { A: 1 },
          vak: { V: 1, Au: 1 },
          entre: { EnT3: 1, EnT1: 1 },
        },
      },
      {
        id: 'C',
        text: '詳しい人にマンツーマンで教えてもらう',
        delta: {
          big5: { E: 1, A: 1 },
          mbti: { EI: m('E') },
          riasec: { S: 1 },
          vak: { Au: 1 },
          entre: { EnT5: 1, EnT2: 1 },
        },
      },
      {
        id: 'D',
        text: 'とりあえず手を動かして、失敗しながら覚える',
        delta: {
          big5: { C: -1, O: 1 },
          mbti: { JP: m('P'), SN: m('N') },
          riasec: { R: 1, EE: 1 },
          vak: { K: 1 },
          entre: { EnT4: 1, EnT3: 1 },
        },
      },
    ],
  },

  // ---------- Q24 ----------
  {
    id: 'Q24',
    type: 'select',
    title: '信頼できる相手の条件は？',
    prompt: '「この人なら本音を話せる」と感じるのは、相手のどんな部分？',
    choices: [
      {
        id: 'A',
        text: '約束を守る、言ったことを必ずやる',
        delta: {
          big5: { C: 2 },
          ennea: { E1: 1, E6: 1 },
          attach: { 'At-Sec': 1 },
          love: { 'L-Act': 1 },
          entre: { EnT7: 1, EnT3: 1 },
        },
      },
      {
        id: 'B',
        text: '自分の話を遮らず最後まで聞いてくれる',
        delta: {
          big5: { A: 2 },
          ennea: { E2: 1, E9: 1 },
          attach: { 'At-Sec': 1, 'At-Anx': 1 },
          love: { 'L-Time': 1, 'L-Word': 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'C',
        text: '一緒に長く時間を過ごしてきた歴史がある',
        delta: {
          big5: { A: 1, N: -1 },
          ennea: { E6: 1, E9: 1 },
          attach: { 'At-Sec': 1, 'At-Anx': 1 },
          love: { 'L-Time': 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'D',
        text: '自分の弱さも見せてくれる、対等な関係',
        delta: {
          big5: { O: 2, A: 1 },
          ennea: { E4: 1, E2: 1, E5: 1 },
          attach: { 'At-Sec': 1 },
          love: { 'L-Word': 1 },
          entre: { EnT1: 1 },
        },
      },
    ],
  },

  // ---------- Q25 ----------
  {
    id: 'Q25',
    type: 'select',
    title: 'パートナーとケンカしたとき、あなたは？',
    prompt: 'パートナー（恋人・家族・親友）と気まずい雰囲気。あなたが取りがちな行動は？',
    choices: [
      {
        id: 'A',
        text: 'その場で全部話し合って、解決するまで離れない',
        delta: {
          big5: { E: 1, N: 1 },
          attach: { 'At-Anx': 1 },
          ennea: { E8: 1, E2: 1, E6: 1 },
          love: { 'L-Word': 1, 'L-Time': 1 },
          mbti: { TF: m('T') },
          entre: { EnT8: 1 },
        },
      },
      {
        id: 'B',
        text: '一旦距離を取って、頭を冷やしてから話す',
        delta: {
          big5: { C: 1, N: -1 },
          attach: { 'At-Sec': 1, 'At-Av': 1 },
          ennea: { E5: 1, E1: 1 },
          love: { 'L-Time': 1 },
          mbti: { TF: m('T') },
          entre: { EnT6: 1 },
        },
      },
      {
        id: 'C',
        text: '何かサプライズや行動で、気持ちで埋め合わせる',
        delta: {
          big5: { A: 2 },
          attach: { 'At-Anx': 1 },
          ennea: { E2: 1, E7: 1 },
          love: { 'L-Gift': 1, 'L-Act': 1 },
          mbti: { TF: m('F') },
          entre: { EnT2: 1, EnT5: 1 },
        },
      },
      {
        id: 'D',
        text: '時間が経てば自然に戻ると、放っておく',
        delta: {
          big5: { E: -1, A: -1 },
          attach: { 'At-Av': 1, 'At-Fea': 1 },
          ennea: { E9: 1, E5: 1 },
          mbti: { JP: m('P') },
          entre: { EnT4: 1 },
        },
      },
    ],
  },

  // ---------- Q26 ----------
  {
    id: 'Q26',
    type: 'select',
    title: 'チームでプロジェクトをやるとき、自然に取るポジションは？',
    prompt: '5人のチームで何かを成し遂げる場面。あなたが自然にハマる役割は？',
    choices: [
      {
        id: 'A',
        text: 'ビジョンを語って全員を引っ張る人',
        delta: {
          big5: { E: 2, O: 1 },
          mbti: { EI: m('E') },
          ennea: { E8: 1, E3: 1 },
          riasec: { EE: 1 },
          entre: { EnT8: 1, EnT4: 1 },
        },
      },
      {
        id: 'B',
        text: '全体を俯瞰して、抜けや遅れを管理する人',
        delta: {
          big5: { C: 2 },
          mbti: { JP: m('J'), TF: m('T') },
          ennea: { E1: 1, E6: 1 },
          riasec: { Co: 1, EE: 1 },
          entre: { EnT7: 1 },
        },
      },
      {
        id: 'C',
        text: 'メンバーのモチベを保って、空気を整える人',
        delta: {
          big5: { A: 2, E: 1 },
          mbti: { TF: m('F') },
          ennea: { E2: 1, E9: 1 },
          riasec: { S: 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'D',
        text: '専門スキルで、難しいパートを巻き取る人',
        delta: {
          big5: { C: 1, O: 1 },
          mbti: { TF: m('T') },
          ennea: { E5: 1, E1: 1 },
          riasec: { I: 1, R: 1 },
          entre: { EnT3: 1, EnT6: 1 },
        },
      },
      {
        id: 'E',
        text: 'アイデアをポンポン出して、新しい切り口を提案する人',
        delta: {
          big5: { O: 2, E: 1 },
          mbti: { SN: m('N'), JP: m('P') },
          ennea: { E7: 1, E4: 1 },
          riasec: { A: 1 },
          entre: { EnT1: 1 },
        },
      },
    ],
  },

  // ---------- Q27 ----------
  {
    id: 'Q27',
    type: 'select',
    title: '失敗したとき、最初に湧いてくる感情は？',
    prompt: '仕事で大きなミス、または大事な人を傷つけた後。最初に身体を駆け抜ける感情は？',
    choices: [
      {
        id: 'A',
        text: '自分への怒り。「なぜできなかった」が最初',
        delta: {
          big5: { C: 1, N: 1 },
          ennea: { E1: 1, E3: 1, E8: 1 },
          attach: { 'At-Av': 1 },
          mbti: { TF: m('T') },
          entre: { EnT8: 1, EnT3: 1 },
        },
      },
      {
        id: 'B',
        text: '周囲への申し訳なさ。「迷惑かけた」が先',
        delta: {
          big5: { A: 2, N: 1 },
          ennea: { E2: 1, E6: 1, E9: 1 },
          attach: { 'At-Anx': 1 },
          mbti: { TF: m('F') },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'C',
        text: '不安。「これからどうしよう」が頭を支配する',
        delta: {
          big5: { N: 2 },
          ennea: { E6: 1, E4: 1, E9: 1 },
          attach: { 'At-Anx': 1, 'At-Fea': 1 },
          mbti: { TF: m('F') },
          entre: { EnT6: 1 },
        },
      },
      {
        id: 'D',
        text: '解決モード。感情は一旦置いて、リカバリ策を考え始める',
        delta: {
          big5: { C: 2, N: -2 },
          ennea: { E3: 1, E5: 1, E8: 1 },
          attach: { 'At-Sec': 1, 'At-Av': 1 },
          mbti: { TF: m('T') },
          entre: { EnT8: 1, EnT6: 1 },
        },
      },
    ],
  },

  // ---------- Q28 ----------
  {
    id: 'Q28',
    type: 'select',
    title: '一人になりたい時間と、人といたい時間の比率',
    prompt: '平均的な一週間で、あなたが心地よく感じる「一人時間」と「誰かといる時間」のバランスは？',
    choices: [
      {
        id: 'A',
        text: '一人7：人と3。基本一人で充電したい',
        delta: {
          big5: { E: -2, O: 1 },
          mbti: { EI: m('I') },
          ennea: { E5: 1, E4: 1 },
          attach: { 'At-Av': 1 },
          entre: { EnT6: 1, EnT1: 1 },
        },
      },
      {
        id: 'B',
        text: '一人5：人と5。半分半分が理想',
        delta: {
          big5: {},
          mbti: { EI: m('neutral', 0) },
          ennea: { E9: 1, E1: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT7: 1, EnT3: 1 },
        },
      },
      {
        id: 'C',
        text: '一人3：人と7。人と話す時間が多い方が元気',
        delta: {
          big5: { E: 1 },
          mbti: { EI: m('E') },
          ennea: { E2: 1, E7: 1, E3: 1 },
          attach: { 'At-Sec': 1 },
          entre: { EnT5: 1, EnT2: 1 },
        },
      },
      {
        id: 'D',
        text: '一人1：人と9。常に誰かといたい',
        delta: {
          big5: { E: 2, A: 1 },
          mbti: { EI: m('E') },
          ennea: { E2: 1, E6: 1, E7: 1 },
          attach: { 'At-Anx': 1 },
          entre: { EnT2: 1, EnT4: 1 },
        },
      },
    ],
  },

  // ---------- Q29 ----------
  {
    id: 'Q29',
    type: 'select',
    title: 'あなたの「美意識」が一番出るのはどこ？',
    prompt: '自分が「ここは妥協できない」とこだわる領域は？',
    choices: [
      {
        id: 'A',
        text: '仕事・成果物のクオリティ',
        delta: {
          big5: { C: 2, O: 1 },
          ennea: { E1: 1, E3: 1 },
          riasec: { EE: 1, Co: 1, I: 1 },
          vak: { V: 1 },
          entre: { EnT3: 1, EnT7: 1, EnT8: 1 },
        },
      },
      {
        id: 'B',
        text: '身につけるもの・住む空間の見た目',
        delta: {
          big5: { O: 2 },
          ennea: { E4: 1, E3: 1 },
          riasec: { A: 1 },
          vak: { V: 1 },
          entre: { EnT1: 1, EnT4: 1 },
        },
      },
      {
        id: 'C',
        text: '言葉遣い・メッセージのトーン',
        delta: {
          big5: { O: 2, A: 1 },
          ennea: { E4: 1, E1: 1, E2: 1 },
          riasec: { A: 1, S: 1 },
          vak: { Au: 1 },
          entre: { EnT1: 1, EnT2: 1 },
        },
      },
      {
        id: 'D',
        text: '関係性・人とのコミュニケーションの質',
        delta: {
          big5: { A: 2, E: 1 },
          ennea: { E2: 1, E9: 1 },
          riasec: { S: 1 },
          vak: { Au: 1 },
          entre: { EnT5: 1, EnT2: 1 },
        },
      },
      {
        id: 'E',
        text: '食事・身体・健康の整え方',
        delta: {
          big5: { C: 1, N: -1 },
          ennea: { E1: 1, E5: 1 },
          riasec: { R: 1 },
          vak: { K: 1 },
          entre: { EnT3: 1, EnT5: 1 },
        },
      },
    ],
  },

  // ---------- Q30 ----------
  {
    id: 'Q30',
    type: 'select',
    title: 'もし会社員じゃなく、自分で何か始めるなら？',
    prompt: '仮に明日から「自分で何かやって食ってけ」と言われたら、どんな方向に動く？',
    choices: [
      {
        id: 'A',
        text: '自分の作品やコンテンツで世界観を売る',
        delta: {
          big5: { O: 2 },
          ennea: { E4: 1, E7: 1 },
          riasec: { A: 1 },
          entre: { EnT1: 1 },
        },
      },
      {
        id: 'B',
        text: 'SNSやコミュニティで人を集めて拡散ビジネス',
        delta: {
          big5: { E: 2, O: 1 },
          ennea: { E7: 1, E2: 1 },
          riasec: { EE: 1, S: 1 },
          entre: { EnT2: 1 },
        },
      },
      {
        id: 'C',
        text: 'ニッチな専門スキルで企業に高単価で請負う',
        delta: {
          big5: { C: 2, O: 1 },
          ennea: { E5: 1, E1: 1 },
          riasec: { I: 1, R: 1 },
          entre: { EnT3: 1 },
        },
      },
      {
        id: 'D',
        text: '影響力を作って、ブランド化していく',
        delta: {
          big5: { E: 2, O: 1 },
          ennea: { E3: 1, E4: 1 },
          riasec: { EE: 1, A: 1 },
          entre: { EnT4: 1 },
        },
      },
      {
        id: 'E',
        text: '人を育てる教室・コーチング・スクール',
        delta: {
          big5: { A: 2, E: 1 },
          ennea: { E2: 1, E9: 1 },
          riasec: { S: 1 },
          entre: { EnT5: 1 },
        },
      },
      {
        id: 'F',
        text: '投資やデータ分析で、リターンを最大化する',
        delta: {
          big5: { C: 2, O: 1, N: -1 },
          ennea: { E5: 1, E6: 1 },
          riasec: { I: 1, Co: 1 },
          entre: { EnT6: 1 },
        },
      },
      {
        id: 'G',
        text: 'プロジェクト統括として、複数事業を回す',
        delta: {
          big5: { C: 2, E: 1 },
          ennea: { E3: 1, E1: 1 },
          riasec: { EE: 1, Co: 1 },
          entre: { EnT7: 1 },
        },
      },
      {
        id: 'H',
        text: '大規模に組織を作って、業界そのものを動かす',
        delta: {
          big5: { E: 2, C: 1 },
          ennea: { E8: 1, E3: 1 },
          riasec: { EE: 1 },
          entre: { EnT8: 1 },
        },
      },
    ],
  },
];

// ===== ナラティブ質問（Q31〜Q37） =====

export const NARRATIVE_QUESTIONS: NarrativeQuestion[] = [
  {
    id: 'Q31',
    type: 'narrative',
    title: '夢中体験',
    prompt: '時間を忘れて没頭した経験を、できるだけ具体的に教えてください。最近のことでも、子どものころのことでもOK。',
    guide: [
      'いつ、どこで、何をしていたか',
      'そのとき身体はどう感じていたか（呼吸、姿勢、感覚）',
      '終わった後、何が残ったか',
    ],
    samples: [
      {
        persona: '30代女性・デザイナー',
        text: '去年の冬、深夜2時にイラレでロゴを作っていた。最初の30分は迷っていたのに、ある瞬間「あ、この方向だ」と分かって、そこから手が勝手に動き始めた。気づいたら朝5時。コーヒーは冷め切っていて、肩はバキバキだったけど、画面の中のロゴは私が想像してた「もっといい何か」になっていた。提出した翌日、クライアントから「このロゴ、見た瞬間泣きそうになった」とメールが来た。あの夜の3時間は、たぶん私の人生で一番自由だった。',
      },
      {
        persona: '40代男性・営業マネージャー',
        text: '部下5人を連れて新規開拓に出た日。一人ずつ別ルートで動かして、夜にホテルのロビーに集まって戦略を組み直した。地図を広げて、付箋を貼って、誰がどこを攻めるか議論した。気づいたら深夜1時。みんなボロボロだったけど目だけ光ってた。翌週、5人全員が契約を取った。あの夜のロビー会議の3時間、俺は完全に「監督」だった。仕事じゃなくて、生きてた。',
      },
      {
        persona: '20代男性・エンジニア',
        text: '大学のとき、サークルで作ったゲームのバグを徹夜で潰してた。仲間3人が部室で、ピザ食べながらコード書いて、テストして、また書いて。時計を見たら朝7時で、外がもう明るかった。「これでリリースできるな」と誰かが言って、3人で笑った。あんなに頭が冴えて、あんなに疲れて、あんなに満たされた夜は、その後一度もない。',
      },
    ],
    extracts: [
      '没入の発火点（一人作業 / チームワーク / 創造 / 解決）',
      'フロー状態の身体感覚',
      '達成後の感情パターン',
      '真の情熱領域（職業適性との照合）',
    ],
  },
  {
    id: 'Q32',
    type: 'narrative',
    title: '怒り・違和感',
    prompt: '「これは絶対に許せない」と感じた経験を3つ、思い出して書いてください。日常の小さな違和感でも、人生レベルの怒りでもOK。',
    guide: [
      '状況（何が起きたか）',
      'そのとき何を感じたか（怒り、悲しみ、軽蔑、無力感など）',
      '結果どう動いたか（言った/我慢した/関係を切った）',
    ],
    samples: [
      {
        persona: '30代女性・看護師',
        text: '病棟の先輩が、患者の家族に対して「面倒くさい家族ですね」と詰所で笑った。その家族は毎日仕事帰りに病院に来て、ずっとお父さんの手を握ってた人だった。私は何も言えなかった。でもその夜、家に帰って布団の中で泣いた。次の日、その先輩には朝の挨拶以外、一切話しかけなくなった。3年経った今も、心の中で許してない。',
      },
      {
        persona: '50代男性・経営者',
        text: '取引先の社長が、自分の秘書に対して「お前みたいな低学歴がよく俺の会社で働けてるな」と笑いながら言った。秘書さんは静かに頭を下げてた。俺はその場で「そういう冗談、俺は嫌いだ」と言った。空気が凍ったが、構わなかった。翌週、その会社との取引を切った。月に300万円の損だったが、後悔はゼロ。',
      },
      {
        persona: '20代男性・フリーランス',
        text: '大学時代の友人が、バイトの後輩に「お前バカだろ」と本気のトーンで言った。後輩は新人で、ミスを謝ってる最中だった。俺は咄嗟に「いや、お前の教え方が下手なだけだろ」と言ってしまった。その友人とはそれ以来連絡を取ってない。後悔はないけど、たまに思い出して胸がザラつく。',
      },
    ],
    extracts: [
      '価値観の核（公平性 / 尊厳 / 誠実性 / 自由 等）',
      'ストレス時の反応パターン（戦う/逃げる/フリーズ）',
      '譲れないラインの位置',
      '怒りのトリガー領域',
    ],
  },
  {
    id: 'Q33',
    type: 'narrative',
    title: '無償でもやること',
    prompt: 'お金を一切もらえなくても、誰にも褒められなくても、やってしまうこと。あなたにとってのそれは何？',
    guide: [
      '具体的な行動・活動',
      'なぜそれをやってしまうか',
      'やった後、自分の中に何が残るか',
    ],
    samples: [
      {
        persona: '40代女性・主婦',
        text: '近所の野良猫の世話。誰にも頼まれてないし、餌代は自腹。雨の日も雪の日も朝晩2回、決まった場所に水と餌を置きに行く。彼らが食べる姿を見てると、なぜか涙が出る。「私、生きてていいんだな」って思える。それだけ。',
      },
      {
        persona: '30代男性・SE',
        text: 'GitHubのオープンソースプロジェクトに、無償でバグフィックスのPRを送り続けてる。月に5〜10件くらい。マージされたとき、世界のどこかで自分のコードが動いてると思うと、ゾクッとする。誰も俺の名前は知らない。それでいい。',
      },
      {
        persona: '20代女性・ライター',
        text: 'Twitterで、知らない人の悲しい投稿に長文リプを送る癖がある。「読んでて勝手に泣きました」って書く。返信が来ることは半分くらい。でも、書いてる時間が一番自分らしい。仕事のコピーを書いてるときより、ずっと真剣。',
      },
    ],
    extracts: ['内発的動機の源泉', 'IKIGAI領域（好き×得意×社会の交差点）', '真の使命感'],
  },
  {
    id: 'Q34',
    type: 'narrative',
    title: '譲れない信念',
    prompt: '「これだけは曲げない」と思っている価値観を3つ、教えてください。「正しさ」じゃなく「自分の中で絶対」のもの。',
    guide: [
      '信念の言語化',
      'なぜそれが自分にとって絶対か（原体験）',
      'それを守ったことで失ったもの・得たもの',
    ],
    samples: [
      {
        persona: '30代男性・教員',
        text: '「子どもに嘘をつかない」。これは絶対。たとえ「先生も知らない」「先生も間違えた」と認めることになっても、絶対に取り繕わない。理由は、俺自身が中学のとき、担任に明らかな嘘をつかれて、それで人生の何かが崩れた経験があるから。だから自分が立場を持ったときから、子どもにだけは絶対に嘘をつかないと決めた。これで職員室で浮くこともある。でも構わない。',
      },
      {
        persona: '50代女性・経営者',
        text: '「社員に嫌な仕事をさせない」。私が昔、上司の私情で意味のない雑用を振られ続けて病んだ経験がある。だから自分の会社では、誰がやっても意味があると説明できない仕事は、誰にも振らない。利益が落ちることもあるけど、これだけは譲らない。社員が私の前で「この仕事、何の意味あるんですか」と聞ける会社にしたかった。',
      },
      {
        persona: '20代男性・ミュージシャン',
        text: '「自分の音を売り物にしない」。レコード会社から3回オファー来たけど全部断った。「売れるためにこれを変えてくれ」と言われた瞬間、心の中で関係が終わった。月収10万円の生活が続いてるけど、自分の音だけは守ってる。これを失ったら、俺は俺じゃなくなる。',
      },
    ],
    extracts: ['コアバリュー', '原体験との連動', '信念の代償（トレードオフ受容度）'],
  },
  {
    id: 'Q35',
    type: 'narrative',
    title: '褒められた強み',
    prompt: 'これまで人から「あなたのここがすごい」と言われた経験を3つ。自分では当たり前だと思ってたことでもOK。',
    guide: [
      '誰に / どんな場面で / どう言われたか',
      'そのとき自分はどう感じたか（嬉しい / ピンとこない / 違和感）',
      '自分でもうっすら認めている部分か',
    ],
    samples: [
      {
        persona: '30代女性・カウンセラー',
        text: 'クライアントから「先生と話してると、自分が透明になっていく感じがする」と言われた。最初は意味が分からなかったけど、後から考えたら、私は相手の話を聞いてるとき、自分の判断や評価をほぼゼロにできる。それを「強み」と言われたのは初めてだった。自分にとっては息するくらい自然なことだったから、逆に驚いた。',
      },
      {
        persona: '40代男性・プロデューサー',
        text: '部下5人から「○○さんのいる会議は、絶対に決まる」と言われた。俺は会議中、誰が何を言ったか全部覚えてて、議論が脱線したら「さっき○○さんが言ってたこの論点、まだ決まってないよね」と戻すクセがある。他人にとっては難しいらしい。俺にとっては、ただ会議が長引くのが嫌なだけ。',
      },
      {
        persona: '20代男性・YouTuber',
        text: 'コメントで「あなたの編集は呼吸が合う」と何度も言われる。自分でもよく分からないけど、カットの間とテロップのタイミングが、視聴者の呼吸と同期してるらしい。意識してやってるわけじゃない。ただ、自分が見て気持ちよくないシーンは絶対に残さない。それを「強み」と言われると、ちょっと照れる。',
      },
    ],
    extracts: ['才能の言語化（CliftonStrengths類似）', '無自覚な強み（Hidden gift）', '強みと自己認識のギャップ'],
  },
  {
    id: 'Q36',
    type: 'narrative',
    title: '5年後の未来妄想',
    prompt: '5年後、人生が「最高にうまくいってる」状態を、できるだけ具体的に描写してください。朝起きて、何をして、誰と会って、どんな気分か。',
    guide: [
      '朝起きる場所と部屋の様子',
      'その日のスケジュール（仕事・人・移動）',
      '周りにいる人と関係性',
      'そのとき自分の中で鳴ってる感情',
    ],
    samples: [
      {
        persona: '30代女性・ライター',
        text: '5年後、京都の町家に住んでる。朝6時に起きて、庭に出てお茶を淹れる。週3日は自分の本を書いて、週2日は若い書き手のメンタリングをしてる。月1回、東京に出張してパートナー（編集者）と打ち合わせ。年収は600万円くらい。お金はそんなに増えてないけど、毎日「これが私の人生だ」と思える。本棚には自分の名前が書かれた本が4冊並んでる。',
      },
      {
        persona: '40代男性・経営者',
        text: '5年後、3つの事業が安定して回ってて、自分は週20時間しか働いてない。朝はジムに行って、午後は読書と瞑想、夕方から家族と食事。月1回、社員全員と1on1をやって、彼らの夢を聞く時間が一番楽しい。会社の規模は今の3倍だけど、自分の関わりは1/3。これが理想だった。海外に別荘を持ってるけど、年に2回しか行かない。それくらいでちょうどいい。',
      },
      {
        persona: '20代男性・クリエイター',
        text: '5年後、自分のチャンネル登録者は100万人を超えてて、でも東京じゃなくて福岡に住んでる。仲間4人とシェアアトリエを構えて、毎日撮影と編集と飲み会。彼女ができてて、たぶん結婚も視野に入ってる。年収は1000万円くらいで、欲しいものは全部買えるけど、もう物欲はあんまりない。「次は何を作ろうか」がいつも頭の中で鳴ってる。',
      },
    ],
    extracts: ['真の願望（社会的成功 vs 内的充足）', 'ライフデザインの構造', '価値観の優先順位（金/時間/人/創造）'],
  },
  {
    id: 'Q37',
    type: 'narrative',
    title: '真似したい人物',
    prompt: '「この人みたいになりたい」「この人の何かを盗みたい」と思う人物を3人。実在でも歴史人物でもキャラクターでもOK。',
    guide: [
      '名前と簡単な紹介',
      'どこに惹かれるか（生き方 / 才能 / 言葉 / 在り方）',
      '自分との共通点・差異',
    ],
    samples: [
      {
        persona: '30代女性',
        text: '①坂本龍一。音楽の才能じゃなく、最後まで「世界に対して語る人」だった姿勢に惹かれる。②ヘミングウェイ。短い文で深く突き刺す力。③高校のときの数学の先生。難しいことを「分かるまで言い換える」忍耐力を盗みたい。3人とも、「分かりやすさ」と「深さ」を両立してる人。私はまだ深さに偏ってる。',
      },
      {
        persona: '40代男性',
        text: '①スティーブ・ジョブズ。完成度に対する狂気。②宮崎駿。70歳超えても現役で、若手に厳しいまま。③父親。学歴はないけど、家族の前で愚痴を言わなかった。3人とも「逃げない人」。俺は逃げ癖がある。彼らに近づきたい。',
      },
      {
        persona: '20代男性',
        text: '①羽生善治。長考のときの呼吸の浅さ。②マツコ・デラックス。一人で番組を支える話術。③漫画キャラのルフィ。仲間に「お前は俺の友達だ」と平気で言える素直さ。俺は素直さが足りない。「カッコつけ」を捨てたい。',
      },
    ],
    extracts: ['自己理想像の構造', '不足認識（自分に欠けていると感じる要素）', 'ロールモデル選好（達人型 / 表現型 / 統率型 / 求道型）'],
  },
  {
    id: 'Q38',
    type: 'narrative',
    title: '分身AIに伝えたいこと（自由記述・最終）',
    prompt:
      'ここまでの回答で「まだAIに伝えたりない」「分身にもこれはわかっておいてほしい」と思うことがあれば、あなたの言葉で、具体的に教えてください。',
    guide: [
      'これまでの生い立ち・職歴・経歴は？',
      '特技、趣味、自慢できることは？',
      '好きな作品・映画・著書・偉人は？',
      'どんな仕事をしているか？',
      'どんなターゲットにどんな商品を提供しているか？',
      'どんな目標やゴールを持っているか？',
      'どんな想い、価値観、信念を大事にしていきたいか？',
      'どんな仲間・お客さんと付き合っていきたいか？',
      'どんなビジョンや世界を実現していきたいか？',
    ],
    samples: [
      {
        persona: '30代女性・編集者',
        text: '私は神戸で生まれて、東京の大学を出てから出版社で12年。でも、本当はずっと「ライティングコーチ」になりたかった。3年前に独立して、今は10人くらいの作家を伴走している。父が銀行員で、子どもの頃から「安定が一番」と言われ続けたけど、私の中では「人の人生を本気で動かす仕事」がずっと優先だった。AIと仕事するときは、「丁寧で、急がない」性格を理解してほしい。早く結論を出されるとシャットダウンする。',
      },
      {
        persona: '40代男性・経営者',
        text: '俺は3社経営してて、本業は飲食。でも本当にやりたいのは「次世代に商売の本質を残すこと」。司馬遼太郎・宮本武蔵・ジョブズが好き。社員には「目の前の客に1000%尽くせ」と毎朝言ってる。10年後、地方の若い起業家に直接金と時間を渡せる立場になりたい。AIに頼むときは、「俺の判断軸は速度＋本質。表面の正論はいらない」と覚えておいてほしい。',
      },
      {
        persona: '20代男性・クリエイター',
        text: 'YouTuberとして活動して4年目。登録者15万人。本当はゲーム実況より「ドキュメンタリー的な人物紹介」が作りたい。でも数字が出ないから言えてない。新海誠と是枝裕和が好き。仲間は3人で、毎週木曜に作戦会議してる。5年後はNetflixみたいなプラットフォームに自分の番組を持ちたい。AIには、「俺は本気で照れ屋だから、まず俺の言いたいことを言語化してから整理してくれ」と頼みたい。',
      },
    ],
    extracts: ['自己開示の質と量', '言語化能力', '内的優先順位', 'AIへの委ね方の好み'],
  },
];

// ===== 統合エクスポート =====

export const QUESTIONS: Question[] = [
  ...SELECT_QUESTIONS,
  ...NARRATIVE_QUESTIONS,
];

// ===== 起業家8タイプメタ =====

export const ENTRE_META: Record<EntreAxis, { code: string; name: string; subtitle: string; trait: string }> = {
  EnT1: { code: 'EnT1', name: 'クリエイター', subtitle: '創天', trait: '独自世界観・芸術・新規事業創造（O高・E中）' },
  EnT2: { code: 'EnT2', name: 'コネクター', subtitle: '兌沢', trait: '人脈・拡散・コミュニケーション（E高・A高）' },
  EnT3: { code: 'EnT3', name: 'メカニック', subtitle: '離火', trait: '技術・システム・効率化（C高・I高）' },
  EnT4: { code: 'EnT4', name: 'スター', subtitle: '震雷', trait: '影響力・カリスマ・ブランディング（E高・O中）' },
  EnT5: { code: 'EnT5', name: 'サポーター', subtitle: '巽風', trait: '育成・チームビルド・教育（A高・S高）' },
  EnT6: { code: 'EnT6', name: 'アナライザー', subtitle: '坎水', trait: '分析・戦略・リサーチ（C高・I高・N低）' },
  EnT7: { code: 'EnT7', name: 'プロデューサー', subtitle: '艮山', trait: '統括・ディレクション・場作り（C高・A中・E中）' },
  EnT8: { code: 'EnT8', name: 'コマンダー', subtitle: '坤地', trait: '経営・統率・大規模ビジネス（E高・C高・T高）' },
};

// ===== エニアグラムメタ =====

export const ENNEA_META: Record<EnneaAxis, { name: string; nickname: string }> = {
  E1: { name: '完璧', nickname: '改革する人' },
  E2: { name: '助力', nickname: '助ける人' },
  E3: { name: '達成', nickname: '達成する人' },
  E4: { name: '個性', nickname: '個性的な人' },
  E5: { name: '探求', nickname: '探求する人' },
  E6: { name: '堅実', nickname: '忠実な人' },
  E7: { name: '楽天', nickname: '熱中する人' },
  E8: { name: '挑戦', nickname: '挑戦する人' },
  E9: { name: '調和', nickname: '平和をもたらす人' },
};
