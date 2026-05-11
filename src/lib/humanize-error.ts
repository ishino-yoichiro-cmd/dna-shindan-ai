/**
 * 全プロダクト共通：エラーメッセージ日本語化ライブラリ
 * 用途：UI/メール/通知に出るエラーを必ず日本語＋対処法に変換
 * 適用：catchで補足→このhumanizeError()を必ず通してからユーザー応答へ
 *
 * 拡張ルール：新APIを採用する度に、その典型エラーをこのテーブルに追記
 */

type Pattern = { match: RegExp | string; jp: string };

const PATTERNS: Pattern[] = [
  // ===== 認証・認可 =====
  { match: /unauthorized|not authenticated|missing.*auth/i, jp: "ログインが必要です。再ログインしてください。" },
  { match: /invalid login|invalid credentials/i, jp: "メールアドレスまたはコードが正しくありません。" },
  { match: /token.*expired|expired/i, jp: "コードの有効期限が切れました。再送信してください。" },
  { match: /missing_permissions/i, jp: "APIキーの権限が不足しています。設定を確認してください。" },

  // ===== レート制限 =====
  { match: /rate.?limit|too many|429/i, jp: "リクエストが集中しています。1〜2分待って再試行してください。" },

  // ===== ファイル名・サイズ =====
  { match: /invalid file name|filename.*invalid/i, jp: "ファイル名に問題があります（半角英数推奨）。再試行してください。" },
  { match: /payload too large|file size|content.too.large/i, jp: "ファイルサイズが大きすぎます。圧縮または短いファイルでお試しください。" },
  { match: /invalid file type|unsupported.*type/i, jp: "ファイル形式が対応していません。許可された形式でお試しください。" },

  // ===== 動画生成（Vidu / Hailuo / Sync / fal.ai 等） =====
  { match: /photoauditnotpass|photo_audit/i, jp: "画像審査に通りませんでした。原因候補：①顔が小さい/横向き ②画質が粗い ③Vidu側の自動審査誤判定。正面・明るい・高解像度の写真でお試しください。" },
  { match: /face.*not.*detect|no.*face/i, jp: "顔が認識できませんでした。正面向きで顔がはっきり写っている画像でお試しください。" },
  { match: /nsfw|inappropriate|sensitive/i, jp: "コンテンツが不適切と判定されました。別の画像/動画でお試しください。" },
  { match: /vidu|hailuo|fal\.ai/i, jp: "動画生成に失敗しました。少し時間をおいて再試行してください。" },

  // ===== URL検証エラー（Vidu lip-sync 等） =====
  { match: /audio_url.*not.*valid/i, jp: "音声ファイルのアクセスに失敗しました。少し待って再試行してください。" },
  { match: /video_url.*not.*valid/i, jp: "動画ファイルのアクセスに失敗しました。少し待って再試行してください。" },
  { match: /image_url.*not.*valid/i, jp: "画像ファイルのアクセスに失敗しました。少し待って再試行してください。" },

  // ===== 音声生成（ElevenLabs） =====
  { match: /paid_plan_required|can_not_use_instant_voice_cloning/i, jp: "ボイスクローン機能はStarterプラン以上が必要です。" },
  { match: /elevenlabs/i, jp: "音声処理に失敗しました。少し時間をおいて再試行してください。" },

  // ===== 画像生成（OpenAI gpt-image-1） =====
  { match: /openai.*content_policy|safety.system/i, jp: "画像生成のコンテンツポリシーに抵触しました。プロンプトを変更してください。" },
  { match: /openai|gpt-image/i, jp: "画像生成に失敗しました。少し時間をおいて再試行してください。" },

  // ===== Claude（Anthropic） =====
  { match: /anthropic|claude/i, jp: "AI処理に失敗しました。少し時間をおいて再試行してください。" },

  // ===== 動画合成 =====
  { match: /ffmpeg|compose.*fail/i, jp: "動画の結合に失敗しました。素材を確認してください。" },

  // ===== ストレージ =====
  { match: /storage.*not.*found|object.*not.*found/i, jp: "ファイルが見つかりません。" },
  { match: /storage|bucket/i, jp: "ファイル保存に失敗しました。" },

  // ===== クレジット・課金 =====
  { match: /insufficient_credits|insufficient.*funds/i, jp: "クレジットが不足しています。プラン変更または追加購入してください。" },
  { match: /payment.*failed|card.*declined/i, jp: "決済に失敗しました。カード情報をご確認ください。" },

  // ===== タイムアウト・通信 =====
  { match: /timeout|timed.?out/i, jp: "応答に時間がかかりすぎました。再試行してください。" },
  { match: /network|fetch failed|econnreset/i, jp: "通信エラーが発生しました。再試行してください。" },

  // ===== HTTPステータス =====
  { match: /http\s*4\d\d|status.*4\d\d/i, jp: "リクエストエラーが発生しました。入力を確認してください。" },
  { match: /http\s*5\d\d|status.*5\d\d/i, jp: "サーバーエラーが発生しました。少し時間をおいて再試行してください。" },

  // ===== DB（Supabase） =====
  { match: /foreign.*key.*user_id/i, jp: "アカウント情報が同期されていません。再ログインしてください。" },
  { match: /violates.*not.null|null.*violation/i, jp: "必須項目が入力されていません。" },
  { match: /unique.*violation|duplicate.*key/i, jp: "既に同じデータが存在します。" },
];

export function humanizeError(raw: unknown): string {
  const msg = typeof raw === "string" ? raw : raw instanceof Error ? raw.message : String(raw);
  if (!msg) return "エラーが発生しました。再試行してください。";

  for (const { match, jp } of PATTERNS) {
    if (typeof match === "string") {
      if (msg.toLowerCase().includes(match.toLowerCase())) return jp;
    } else if (match.test(msg)) {
      return jp;
    }
  }

  // 既知パターンに該当しない場合のフォールバック
  const trimmed = msg.replace(/^Error:\s*/, "").slice(0, 150);
  return `処理に失敗しました：${trimmed}`;
}

/** Next.js APIルートでcatchから一発で日本語化レスポンスを返すヘルパー */
export function errorResponse(raw: unknown, status = 500) {
  return Response.json({ error: humanizeError(raw), raw: String(raw).slice(0, 300) }, { status });
}
