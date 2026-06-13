-- 1. Auto-create a business_profiles record when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.business_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill business_id on existing rows using the single existing business_profiles record
DO $$
DECLARE
  v_business_id UUID;
BEGIN
  SELECT id INTO v_business_id FROM business_profiles ORDER BY created_at LIMIT 1;

  IF v_business_id IS NOT NULL THEN
    UPDATE customers SET business_id = v_business_id WHERE business_id IS NULL;
    UPDATE appointments SET business_id = v_business_id WHERE business_id IS NULL;
    UPDATE orders SET business_id = v_business_id WHERE business_id IS NULL;
    UPDATE services SET business_id = v_business_id WHERE business_id IS NULL;
    UPDATE blocked_dates SET business_id = v_business_id WHERE business_id IS NULL;
    UPDATE group_sessions SET business_id = v_business_id WHERE business_id IS NULL;
    UPDATE group_session_participants SET business_id = v_business_id WHERE business_id IS NULL;
    UPDATE activity_log SET business_id = v_business_id WHERE business_id IS NULL;
  END IF;
END $$;
