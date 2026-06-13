ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profiles(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profiles(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profiles(id);
ALTER TABLE services ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profiles(id);
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profiles(id);
ALTER TABLE group_sessions ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profiles(id);
ALTER TABLE group_session_participants ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profiles(id);
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profiles(id);

CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business_id ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_business_id ON blocked_dates(business_id);
CREATE INDEX IF NOT EXISTS idx_group_sessions_business_id ON group_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_group_session_participants_business_id ON group_session_participants(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_business_id ON activity_log(business_id);
