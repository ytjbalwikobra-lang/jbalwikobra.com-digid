-- ============================================================================
-- Migration 070: RPC get_chat_statistics()
-- Menggantikan 6 parallel count queries + 1 RPC call di statsService.ts
-- dengan satu panggilan database yang mengembalikan semua statistik chat.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_chat_statistics()
RETURNS TABLE(
  total_conversations BIGINT,
  open_conversations BIGINT,
  assigned_conversations BIGINT,
  resolved_conversations BIGINT,
  avg_rating NUMERIC,
  ratings_count BIGINT
) AS $$
  SELECT
    (SELECT COUNT(*) FROM public.chat_conversations) AS total_conversations,
    (SELECT COUNT(*) FROM public.chat_conversations WHERE status = 'open') AS open_conversations,
    (SELECT COUNT(*) FROM public.chat_conversations WHERE status = 'assigned') AS assigned_conversations,
    (SELECT COUNT(*) FROM public.chat_conversations WHERE status IN ('resolved', 'closed')) AS resolved_conversations,
    (SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0) FROM public.chat_ratings) AS avg_rating,
    (SELECT COUNT(*) FROM public.chat_ratings) AS ratings_count;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_chat_statistics() IS 'Statistik chat lengkap dalam satu panggilan — menggantikan 7 query paralel di statsService';

-- Grant ke service_role (digunakan oleh API backend)
GRANT EXECUTE ON FUNCTION public.get_chat_statistics() TO service_role;
