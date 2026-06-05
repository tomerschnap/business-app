-- Orders: add service and price columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_name TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- Business profiles: add email field
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
