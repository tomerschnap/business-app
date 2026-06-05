-- Add price per participant to group sessions
ALTER TABLE group_sessions ADD COLUMN IF NOT EXISTS price_per_participant NUMERIC DEFAULT 0;

-- Participants list for each group session
CREATE TABLE IF NOT EXISTS group_session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE group_session_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users only" ON group_session_participants FOR ALL USING (auth.uid() IS NOT NULL);
