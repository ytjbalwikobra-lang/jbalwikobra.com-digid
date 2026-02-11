-- Add invoice/payment metadata columns to orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS xendit_invoice_id TEXT,
ADD COLUMN IF NOT EXISTS xendit_invoice_url TEXT,
ADD COLUMN IF NOT EXISTS currency VARCHAR(10),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(50),
ADD COLUMN IF NOT EXISTS payer_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS payer_phone VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_orders_xendit_invoice_id ON orders(xendit_invoice_id);