-- Add customer WhatsApp column to orders table
-- Migration: 20250918_add_customer_whatsapp_column

-- Add customer_whatsapp column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_whatsapp VARCHAR(50);

-- Add index for better performance on WhatsApp lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_whatsapp ON public.orders(customer_whatsapp);

-- Add comment to describe the new column
COMMENT ON COLUMN public.orders.customer_whatsapp IS 'Customer WhatsApp number for direct communication and consultation tracking';
