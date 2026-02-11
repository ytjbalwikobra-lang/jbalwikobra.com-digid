-- Migration: Add Chat Enhancements (Typing Indicators & Canned Responses)
-- Date: 2026-02-11
-- Purpose: Add typing indicators and canned response templates

-- =============================================================================
-- 1. TYPING INDICATORS TABLE
-- =============================================================================
-- Track who is currently typing in a conversation
-- This table uses TTL (Time To Live) - records auto-expire after 5 seconds

CREATE TABLE IF NOT EXISTS public.chat_typing_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    
    -- Who is typing
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    user_type VARCHAR(20) CHECK (user_type IN ('customer', 'admin', 'system')),
    user_name VARCHAR(255),
    
    -- Timestamp for auto-cleanup (records older than 5 seconds should be ignored)
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one typing indicator per user per conversation
    UNIQUE(conversation_id, user_id, user_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_typing_conversation ON public.chat_typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_updated_at ON public.chat_typing_indicators(updated_at DESC);

-- Function to auto-cleanup old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
    DELETE FROM public.chat_typing_indicators
    WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. CANNED RESPONSES TABLE
-- =============================================================================
-- Store template messages for quick admin responses

CREATE TABLE IF NOT EXISTS public.chat_canned_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template info
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(100), -- e.g., 'greeting', 'closing', 'faq', 'technical'
    
    -- Shortcut for quick access (e.g., '/hello', '/thanks')
    shortcut VARCHAR(50) UNIQUE,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Organization
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_canned_active ON public.chat_canned_responses(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_canned_category ON public.chat_canned_responses(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_canned_shortcut ON public.chat_canned_responses(shortcut) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_canned_usage ON public.chat_canned_responses(usage_count DESC);

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_canned_response_usage(response_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.chat_canned_responses
    SET 
        usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = response_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. RLS POLICIES FOR TYPING INDICATORS
-- =============================================================================

ALTER TABLE public.chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- Customers can see typing indicators in their own conversations
CREATE POLICY "Customers view own conversation typing"
    ON public.chat_typing_indicators
    FOR SELECT
    TO authenticated, anon
    USING (
        conversation_id IN (
            SELECT id FROM public.chat_conversations
            WHERE customer_email = current_setting('request.jwt.claims', true)::json->>'email'
            OR user_id = auth.uid()
        )
    );

-- Admins can see all typing indicators
CREATE POLICY "Admins view all typing"
    ON public.chat_typing_indicators
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Users can update their own typing indicator
CREATE POLICY "Users update own typing"
    ON public.chat_typing_indicators
    FOR ALL
    TO authenticated, anon
    USING (
        user_id = auth.uid()
        OR (user_type = 'customer' AND user_id IS NULL)
    );

-- Admins can manage all typing indicators
CREATE POLICY "Admins manage all typing"
    ON public.chat_typing_indicators
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- =============================================================================
-- 4. RLS POLICIES FOR CANNED RESPONSES
-- =============================================================================

ALTER TABLE public.chat_canned_responses ENABLE ROW LEVEL SECURITY;

-- Only admins can view canned responses
CREATE POLICY "Admins view canned responses"
    ON public.chat_canned_responses
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Only admins can manage canned responses
CREATE POLICY "Admins manage canned responses"
    ON public.chat_canned_responses
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- =============================================================================
-- 5. ENABLE REALTIME FOR NEW TABLES
-- =============================================================================

DO $$
BEGIN
    -- Enable realtime for typing indicators
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_typing_indicators'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_typing_indicators;
    END IF;
END $$;

-- =============================================================================
-- 6. INSERT DEFAULT CANNED RESPONSES
-- =============================================================================

INSERT INTO public.chat_canned_responses (title, message, category, shortcut, sort_order)
VALUES
    ('Greeting - Terima Kasih', 
     'Terima kasih telah menghubungi kami! Saya siap membantu Anda. Ada yang bisa saya bantu?', 
     'greeting', '/hello', 1),
    
    ('Menunggu Info', 
     'Mohon tunggu sebentar, saya sedang mengecek informasi yang Anda butuhkan.', 
     'status', '/wait', 2),
    
    ('Closing - Senang Membantu', 
     'Senang bisa membantu Anda! Jika ada pertanyaan lain, jangan ragu untuk menghubungi kami kembali.', 
     'closing', '/thanks', 3),
    
    ('FAQ - Cara Order', 
     'Untuk melakukan pemesanan: 1) Cari produk yang diinginkan, 2) Klik "Beli Sekarang", 3) Isi form data, 4) Pilih metode pembayaran, 5) Selesaikan pembayaran.', 
     'faq', '/order', 4),
    
    ('FAQ - Status Pesanan', 
     'Anda bisa mengecek status pesanan di halaman "Pesanan Saya" atau melalui email konfirmasi yang kami kirimkan.', 
     'faq', '/status', 5),
    
    ('FAQ - Pembayaran', 
     'Kami menerima berbagai metode pembayaran: VA Bank, E-Wallet (OVO, GoPay, DANA), QRIS, dan Kartu Kredit/Debit.', 
     'faq', '/payment', 6),
    
    ('Technical - Sedang Dicek', 
     'Terima kasih atas laporannya. Tim teknis kami sedang mengecek masalah ini dan akan segera memberikan solusi.', 
     'technical', '/tech', 7),
    
    ('Follow Up', 
     'Apakah masalah Anda sudah teratasi? Beritahu kami jika masih ada yang bisa kami bantu.', 
     'followup', '/followup', 8)
ON CONFLICT (shortcut) DO NOTHING;

-- =============================================================================
-- NOTES
-- =============================================================================
-- After running this migration:
-- 1. Typing indicators will show in real-time
-- 2. Admins can use canned responses with shortcuts (e.g., /hello)
-- 3. Old typing indicators auto-cleanup after 10 seconds
-- 4. Canned responses tracked for usage analytics
-- 5. Run cleanup_old_typing_indicators() periodically via cron
