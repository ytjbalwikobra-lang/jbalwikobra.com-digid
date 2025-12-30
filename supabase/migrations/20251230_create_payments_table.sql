-- Create payments table for tracking Xendit payment transactions
-- This table stores detailed payment information separate from orders

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    xendit_id VARCHAR(255) UNIQUE NOT NULL, -- Xendit payment/invoice ID
    external_id VARCHAR(255) NOT NULL, -- Our external reference ID
    payment_method VARCHAR(50) NOT NULL, -- qris, bni, bri, mandiri, etc.
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    status VARCHAR(50) NOT NULL, -- PENDING, PAID, COMPLETED, CANCELLED, EXPIRED
    payment_data JSONB, -- Store QR string, VA details, etc.
    description TEXT,
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_xendit_id ON payments(xendit_id);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Create updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow service role full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='payments' 
        AND policyname='Service role has full access to payments'
    ) THEN
        CREATE POLICY "Service role has full access to payments" ON payments
            FOR ALL
            USING (auth.role() = 'service_role')
            WITH CHECK (auth.role() = 'service_role');
    END IF;
END $$;

-- Allow authenticated users to view their own payments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename='payments' 
        AND policyname='Users can view payments'
    ) THEN
        CREATE POLICY "Users can view payments" ON payments
            FOR SELECT
            USING (true); -- For now, allow all authenticated users to read
    END IF;
END $$;

-- Grant access
GRANT SELECT ON payments TO anon, authenticated;
GRANT ALL ON payments TO service_role;

-- Verification
SELECT 
    'Payments table created successfully!' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'payments') as column_count;
