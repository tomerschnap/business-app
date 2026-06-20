-- ── business_profiles ─────────────────────────────────────────────────────────
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_profiles: own row only"
  ON business_profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ── Helper: resolve the caller's business_profiles.id ─────────────────────────
-- Defined as SECURITY DEFINER so the RLS policies on the 8 data tables can call
-- it without recursing back through RLS on business_profiles.
CREATE OR REPLACE FUNCTION public.my_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM business_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;


-- ── customers ─────────────────────────────────────────────────────────────────
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers: own business only"
  ON customers
  FOR ALL
  USING (business_id = my_business_id())
  WITH CHECK (business_id = my_business_id());


-- ── appointments ──────────────────────────────────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments: own business only"
  ON appointments
  FOR ALL
  USING (business_id = my_business_id())
  WITH CHECK (business_id = my_business_id());


-- ── orders ────────────────────────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders: own business only"
  ON orders
  FOR ALL
  USING (business_id = my_business_id())
  WITH CHECK (business_id = my_business_id());


-- ── services ──────────────────────────────────────────────────────────────────
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services: own business only"
  ON services
  FOR ALL
  USING (business_id = my_business_id())
  WITH CHECK (business_id = my_business_id());


-- ── blocked_dates ─────────────────────────────────────────────────────────────
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_dates: own business only"
  ON blocked_dates
  FOR ALL
  USING (business_id = my_business_id())
  WITH CHECK (business_id = my_business_id());


-- ── group_sessions ────────────────────────────────────────────────────────────
ALTER TABLE group_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_sessions: own business only"
  ON group_sessions
  FOR ALL
  USING (business_id = my_business_id())
  WITH CHECK (business_id = my_business_id());


-- ── group_session_participants ────────────────────────────────────────────────
ALTER TABLE group_session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_session_participants: own business only"
  ON group_session_participants
  FOR ALL
  USING (business_id = my_business_id())
  WITH CHECK (business_id = my_business_id());


-- ── activity_log ──────────────────────────────────────────────────────────────
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log: own business only"
  ON activity_log
  FOR ALL
  USING (business_id = my_business_id())
  WITH CHECK (business_id = my_business_id());
