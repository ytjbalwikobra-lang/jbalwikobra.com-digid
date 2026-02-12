-- Fungsi RPC untuk atomic increment usage_count pada canned response
-- Menghindari race condition read-then-write

CREATE OR REPLACE FUNCTION public.increment_canned_usage(row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.chat_canned_responses
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.increment_canned_usage(UUID) IS 'Atomic increment usage_count untuk canned response — menghindari race condition';
