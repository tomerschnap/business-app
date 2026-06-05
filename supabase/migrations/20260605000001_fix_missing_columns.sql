-- Fix missing columns in appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ממתין';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- Fix missing column in customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Create missing activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth users only" ON activity_log;
CREATE POLICY "auth users only" ON activity_log FOR ALL USING (auth.uid() IS NOT NULL);
