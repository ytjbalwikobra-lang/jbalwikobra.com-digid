-- Optimized RPC for order statistics
-- This reduces multiple count queries to a single aggregated query

CREATE OR REPLACE FUNCTION get_order_stats_optimized()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
BEGIN
  -- Single query with aggregated counts
  SELECT jsonb_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'confirmed', COUNT(*) FILTER (WHERE status = 'confirmed'), 
    'processing', COUNT(*) FILTER (WHERE status = 'processing'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'total', COUNT(*)
  ) INTO result
  FROM orders;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_order_stats_optimized() TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_stats_optimized() TO anon;