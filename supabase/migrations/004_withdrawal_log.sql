-- ============================================================
-- Escala PASCOM — Withdrawal log + Realtime
-- Run this in Supabase SQL Editor
-- ============================================================

-- Table to store withdrawal reasons
CREATE TABLE IF NOT EXISTS withdrawal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE withdrawal_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_withdrawal" ON withdrawal_log FOR SELECT USING (true);
CREATE POLICY "public_insert_withdrawal" ON withdrawal_log FOR INSERT WITH CHECK (true);

-- Enable Realtime for assignments (if not already done)
-- This is idempotent and safe to run multiple times
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
  END IF;
END
$$;
