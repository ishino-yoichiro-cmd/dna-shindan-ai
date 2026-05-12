-- 感想テーブル（管理画面一覧 + 診断者別表示用）
CREATE TABLE IF NOT EXISTS dna_feedbacks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID NOT NULL REFERENCES dna_diagnoses(id) ON DELETE CASCADE,
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dna_feedbacks_diagnosis_id_idx ON dna_feedbacks(diagnosis_id);
CREATE INDEX IF NOT EXISTS dna_feedbacks_created_at_idx   ON dna_feedbacks(created_at DESC);

ALTER TABLE dna_feedbacks ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dna_feedbacks' AND policyname='no_public_access') THEN
    CREATE POLICY "no_public_access" ON dna_feedbacks FOR ALL USING (false);
  END IF;
END$$;

-- テスト名のレコードを自動非表示（初回マイグレーション時のみ適用）
UPDATE dna_diagnoses
SET hidden_at = COALESCE(hidden_at, NOW())
WHERE hidden_at IS NULL
  AND (
    first_name ILIKE '%テスト%' OR last_name ILIKE '%テスト%' OR
    first_name ILIKE '%test%'   OR last_name ILIKE '%test%' OR
    clone_display_name ILIKE '%テスト%' OR clone_display_name ILIKE '%test%'
  );
