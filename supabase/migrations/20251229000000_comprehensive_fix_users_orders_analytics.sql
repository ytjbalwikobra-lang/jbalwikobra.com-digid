-- =============================================================================
-- COMPREHENSIVE FIX FOR ALL ADMIN PANEL ISSUES
-- =============================================================================
-- This migration fixes:
-- 1. Creates public.users table (currently missing, causing analytics to fail)
-- 2. Ensures orders table has proper RLS policies for service_role
-- 3. Fixes analytics queries to use correct tables
-- 4. Ensures admin_notifications table exists with proper policies
-- 5. Adds proper indexes for performance
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. CREATE PUBLIC.USERS TABLE
-- =============================================================================
-- The system uses public.users but it doesn't exist. We have auth.users and profiles.
-- Create a proper users table that the admin panel expects.

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user',
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_service_role_all" ON public.users;
DROP POLICY IF EXISTS "users_public_read" ON public.users;
DROP POLICY IF EXISTS "users_authenticated_read_own" ON public.users;

-- Service role has full access (for admin API)
CREATE POLICY "users_service_role_all" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public can read basic user info (for public profiles)
CREATE POLICY "users_public_read" ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can update their own records
CREATE POLICY "users_authenticated_update_own" ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_users_updated_at();

-- Function to sync auth.users to public.users
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_users()
RETURNS TRIGGER AS $$
BEGIN
    -- On auth user creation, create corresponding public.users record
    INSERT INTO public.users (
        auth_user_id,
        email,
        name,
        role,
        is_admin,
        created_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, FALSE),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        auth_user_id = EXCLUDED.auth_user_id,
        name = COALESCE(EXCLUDED.name, users.name),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync auth.users to public.users
DROP TRIGGER IF EXISTS sync_auth_user_to_users_trigger ON auth.users;
CREATE TRIGGER sync_auth_user_to_users_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_auth_user_to_users();

-- Migrate existing profiles to users table
INSERT INTO public.users (name, email, role, is_admin, created_at, auth_user_id)
SELECT 
    p.name,
    au.email,
    p.role,
    (p.role IN ('admin', 'superadmin', 'super-admin', 'owner')) as is_admin,
    p.created_at,
    p.id
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- 2. ENSURE ORDERS TABLE HAS PROPER POLICIES
-- =============================================================================

-- Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "orders_service_role_all" ON public.orders;
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_authenticated_read_own" ON public.orders;

-- Service role has full access (for admin API)
CREATE POLICY "orders_service_role_all" ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public to create orders (for checkout)
CREATE POLICY "orders_public_insert" ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can read their own orders
CREATE POLICY "orders_authenticated_read_own" ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- =============================================================================
-- 3. ENSURE ADMIN_NOTIFICATIONS TABLE EXISTS WITH PROPER STRUCTURE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL DEFAULT 'new_order',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    user_id UUID,
    customer_name VARCHAR(255),
    product_name VARCHAR(255),
    amount BIGINT,
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for admin_notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_order_id ON public.admin_notifications(order_id);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "admin_notifications_service_role_all" ON public.admin_notifications;
DROP POLICY IF EXISTS "admin_notifications_authenticated_admin" ON public.admin_notifications;

-- Service role has full access
CREATE POLICY "admin_notifications_service_role_all" ON public.admin_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated admin users can read notifications
CREATE POLICY "admin_notifications_authenticated_admin" ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.auth_user_id = auth.uid() 
      AND users.is_admin = TRUE
    )
  );

-- =============================================================================
-- 4. ADD MISSING COLUMNS TO ORDERS TABLE IF NOT EXISTS
-- =============================================================================

-- Add user_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Add xendit_invoice_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'xendit_invoice_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN xendit_invoice_id VARCHAR(255);
    END IF;
END $$;

-- Add xendit_invoice_url if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'xendit_invoice_url'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN xendit_invoice_url TEXT;
    END IF;
END $$;

-- Add client_external_id if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'client_external_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN client_external_id VARCHAR(255) UNIQUE;
    END IF;
END $$;

-- Add product_name if not exists (denormalized for performance)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN product_name VARCHAR(255);
    END IF;
END $$;

-- Add currency if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN currency VARCHAR(3) DEFAULT 'IDR';
    END IF;
END $$;

-- Add expires_at if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add paid_at if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'paid_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add payer_email if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'payer_email'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN payer_email VARCHAR(255);
    END IF;
END $$;

-- Add payment_channel if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'payment_channel'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN payment_channel VARCHAR(100);
    END IF;
END $$;

-- Add payer_phone if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders' 
        AND column_name = 'payer_phone'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN payer_phone VARCHAR(50);
    END IF;
END $$;

-- =============================================================================
-- 5. CREATE INDEXES FOR BETTER PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_xendit_invoice_id ON public.orders(xendit_invoice_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_external_id ON public.orders(client_external_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON public.orders(status, created_at DESC);

-- =============================================================================
-- 6. CREATE HELPER FUNCTIONS FOR ANALYTICS
-- =============================================================================

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS TABLE (
    total_orders BIGINT,
    completed_orders BIGINT,
    pending_orders BIGINT,
    total_revenue NUMERIC,
    completed_revenue NUMERIC,
    total_users BIGINT,
    total_products BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.orders)::BIGINT as total_orders,
        (SELECT COUNT(*) FROM public.orders WHERE status IN ('completed', 'paid'))::BIGINT as completed_orders,
        (SELECT COUNT(*) FROM public.orders WHERE status = 'pending')::BIGINT as pending_orders,
        (SELECT COALESCE(SUM(amount), 0) FROM public.orders WHERE status IN ('completed', 'paid'))::NUMERIC as total_revenue,
        (SELECT COALESCE(SUM(amount), 0) FROM public.orders WHERE status IN ('completed', 'paid'))::NUMERIC as completed_revenue,
        (SELECT COUNT(*) FROM public.users)::BIGINT as total_users,
        (SELECT COUNT(*) FROM public.products)::BIGINT as total_products;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. INSERT DEFAULT ADMIN USER IF NOT EXISTS
-- =============================================================================

-- Create a default admin user in public.users table for testing
INSERT INTO public.users (
    name, 
    email, 
    role, 
    is_admin, 
    is_active,
    phone
)
VALUES (
    'Admin User',
    'admin@jbalwikobra.com',
    'admin',
    TRUE,
    TRUE,
    '6281234567890'
)
ON CONFLICT (email) DO UPDATE SET
    is_admin = TRUE,
    role = 'admin',
    updated_at = NOW();

COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these queries after migration to verify everything works:
--
-- 1. Check users table:
--    SELECT COUNT(*) FROM public.users;
--
-- 2. Check orders table:
--    SELECT COUNT(*) FROM public.orders;
--
-- 3. Check admin notifications:
--    SELECT COUNT(*) FROM public.admin_notifications;
--
-- 4. Test dashboard stats function:
--    SELECT * FROM public.get_dashboard_stats();
--
-- 5. Verify RLS policies:
--    SELECT tablename, policyname, roles, cmd, qual 
--    FROM pg_policies 
--    WHERE schemaname = 'public' 
--    AND tablename IN ('users', 'orders', 'admin_notifications');
-- =============================================================================
