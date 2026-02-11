-- Ensure payments table exists with correct structure for storing QRIS and other payment data
-- Created: 2025-12-30
-- Description: This migration ensures the payments table has all necessary columns
--              to store payment information including QR codes for QRIS payments

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    xendit_id VARCHAR(255) UNIQUE NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    payment_data JSONB, -- Stores QR code, VA details, etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    -- Add xendit_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'xendit_id'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN xendit_id VARCHAR(255) UNIQUE NOT NULL;
    END IF;

    -- Add external_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'external_id'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN external_id VARCHAR(255) NOT NULL;
    END IF;

    -- Add payment_data JSONB column if not exists (critical for storing QR code)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'payment_data'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN payment_data JSONB;
    END IF;

    -- Add other necessary columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'expiry_date'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN expiry_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'paid_at'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.payments ADD COLUMN description TEXT;
    END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_xendit_id ON public.payments(xendit_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON public.payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "payments_service_role_all" ON public.payments;

-- Create policy for service role (used by API)
CREATE POLICY "payments_service_role_all" ON public.payments
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Add comment to table
COMMENT ON TABLE public.payments IS 
'Stores payment transaction data from Xendit including QR codes for QRIS, VA details, and other payment-specific information. Updated: 2025-12-30';

COMMENT ON COLUMN public.payments.payment_data IS 
'JSONB field storing payment-method-specific data: qr_string, qr_url for QRIS; account_number, bank_code for VA; etc.';
