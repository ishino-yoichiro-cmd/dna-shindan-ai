-- システム設定テーブル（予算アラート送信履歴など内部フラグ管理用）
CREATE TABLE IF NOT EXISTS dna_system_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: service_role のみアクセス可（anon/authenticated は一切触れない）
ALTER TABLE dna_system_config ENABLE ROW LEVEL SECURITY;
-- 全拒否ポリシー（service_role は RLS をバイパスするので問題なし）
CREATE POLICY "no_public_access" ON dna_system_config
  FOR ALL USING (false);
