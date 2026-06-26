ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS instagram_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_instagram_business
  ON customers (instagram_id, business_id)
  WHERE instagram_id IS NOT NULL;
