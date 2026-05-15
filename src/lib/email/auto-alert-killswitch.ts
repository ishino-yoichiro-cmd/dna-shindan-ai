// 自動アラートメール（PDF生成失敗・予算超過・cron系・feedback通知）の kill switch
// YO 2026-05-16 指示: 「自動の完了報告以外のメールはなるべく自分で送りたい」
// 環境変数 DISABLE_AUTO_ALERTS=1 で全停止。デフォルトは未設定なので「停止」扱い。
// 顧客向けメール（submit受信メール・process-pending の完了レポート）と
// 管理画面からの手動送信は影響を受けない。

export function autoAlertsDisabled(): boolean {
  const v = (process.env.DISABLE_AUTO_ALERTS ?? '').trim();
  return v === '1' || v.toLowerCase() === 'true';
}
