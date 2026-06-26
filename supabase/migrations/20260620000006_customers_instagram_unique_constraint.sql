-- Replace partial index with a full unique constraint so PostgREST ON CONFLICT works
DROP INDEX IF EXISTS uq_customers_instagram_business;

ALTER TABLE customers
  ADD CONSTRAINT uq_customers_instagram_business UNIQUE (instagram_id, business_id);
