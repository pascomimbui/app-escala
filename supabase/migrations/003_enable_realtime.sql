-- ============================================================
-- Escala PASCOM — Enable Realtime for assignments
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable Realtime publication for the assignments table.
-- This is REQUIRED for the Supabase Realtime JS client to receive
-- postgres_changes events (INSERT, UPDATE, DELETE).

ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
