-- Customer extended fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS debt NUMERIC DEFAULT 0;

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  duration TEXT DEFAULT '30 דקות',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth users only" ON services;
CREATE POLICY "auth users only" ON services FOR ALL USING (auth.uid() IS NOT NULL);

-- Blocked dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth users only" ON blocked_dates;
CREATE POLICY "auth users only" ON blocked_dates FOR ALL USING (auth.uid() IS NOT NULL);
