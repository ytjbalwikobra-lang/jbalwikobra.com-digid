-- Add sold_channel for product sales source tracking
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sold_channel text;

-- Optional: document allowed values
COMMENT ON COLUMN public.products.sold_channel IS 'Sales source: web | wa (NULL = active)';
