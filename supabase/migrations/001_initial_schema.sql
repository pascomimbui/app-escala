-- ============================================================
-- Escala PASCOM — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, time)
);

-- EVENT_ROLES
CREATE TABLE IF NOT EXISTS event_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('camera', 'mesa')),
  UNIQUE(event_id, role)
);

-- ASSIGNMENTS
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_role_id UUID NOT NULL REFERENCES event_roles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_role_id)
);

-- SWAP_REQUESTS
CREATE TABLE IF NOT EXISTS swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATION_LOG
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'sent'
);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_users" ON users FOR SELECT USING (true);
CREATE POLICY "public_insert_users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_users" ON users FOR UPDATE USING (true);
CREATE POLICY "public_read_events" ON events FOR SELECT USING (true);
CREATE POLICY "public_insert_events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_events" ON events FOR UPDATE USING (true);
CREATE POLICY "public_delete_events" ON events FOR DELETE USING (true);
CREATE POLICY "public_read_event_roles" ON event_roles FOR SELECT USING (true);
CREATE POLICY "public_insert_event_roles" ON event_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_event_roles" ON event_roles FOR DELETE USING (true);
CREATE POLICY "public_read_assignments" ON assignments FOR SELECT USING (true);
CREATE POLICY "public_insert_assignments" ON assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_assignments" ON assignments FOR DELETE USING (true);
CREATE POLICY "public_read_swap_requests" ON swap_requests FOR SELECT USING (true);
CREATE POLICY "public_insert_swap_requests" ON swap_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_swap_requests" ON swap_requests FOR UPDATE USING (true);
CREATE POLICY "public_read_notification_log" ON notification_log FOR SELECT USING (true);
CREATE POLICY "public_insert_notification_log" ON notification_log FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_event_roles_event_id ON event_roles(event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_event_role_id ON assignments(event_role_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_token ON swap_requests(token);
