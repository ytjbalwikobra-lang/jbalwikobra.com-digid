-- =====================================================
-- 🔍 CHECK WHATSAPP CONFIGURATION
-- =====================================================
-- 
-- Jalankan SQL ini di Supabase Dashboard:
-- 1. Buka Supabase Dashboard
-- 2. Pilih Project: jbalwikobra
-- 3. Klik "SQL Editor" di sidebar
-- 4. Copy-paste SQL ini
-- 5. Klik "Run" atau tekan Ctrl+Enter
-- 
-- =====================================================

-- Query 1: Check current WhatsApp settings
SELECT 
  id,
  provider,
  base_url,
  api_key,
  session,
  is_active,
  default_group_id,
  created_at,
  updated_at,
  CASE 
    WHEN provider = 'none' THEN '❌ Provider not set'
    WHEN provider = 'fonnte' THEN '✅ Using Fonnte'
    WHEN provider = 'waha' THEN '✅ Using WAHA'
    ELSE '⚠️ Unknown provider'
  END as provider_status,
  CASE 
    WHEN is_active = true THEN '✅ Active'
    ELSE '❌ Not active'
  END as active_status,
  CASE 
    WHEN api_key IS NULL OR api_key = '' THEN '❌ API Key missing'
    ELSE '✅ API Key set'
  END as api_key_status
FROM admin_whatsapp_settings
ORDER BY created_at DESC;

-- Query 2: Count total records
SELECT COUNT(*) as total_records FROM admin_whatsapp_settings;

-- =====================================================
-- 💡 HASIL YANG DIHARAPKAN:
-- =====================================================
-- 
-- Jika provider = 'none' atau is_active = false:
--   ❌ WhatsApp TIDAK CONFIGURED
-- 
-- Jika provider = 'fonnte'/'waha' dan is_active = true:
--   ✅ WhatsApp SUDAH CONFIGURED
-- 
-- =====================================================
-- 📝 CARA UPDATE CONFIGURATION:
-- =====================================================
-- 
-- Jika WhatsApp belum configured, jalankan SQL ini:
-- 
-- UPDATE admin_whatsapp_settings
-- SET
--   provider = 'fonnte',
--   base_url = 'https://api.fonnte.com',
--   api_key = 'YOUR_FONNTE_TOKEN_HERE',  -- GANTI dengan token Anda
--   is_active = true,
--   default_group_id = 'YOUR_GROUP_ID_HERE'  -- GANTI dengan ID grup
-- WHERE id = (SELECT id FROM admin_whatsapp_settings LIMIT 1);
-- 
-- 🔗 Dapatkan Fonnte Token:
--    1. Daftar/login di https://fonnte.com
--    2. Dashboard → API Token
--    3. Copy token
-- 
-- 📱 Dapatkan Group ID:
--    1. Forward message dari grup ke nomor Fonnte
--    2. Check response untuk melihat group ID
--    3. Format: 628xxxxxxxxxx-yyyyyyyyyy@g.us
-- 
-- =====================================================
