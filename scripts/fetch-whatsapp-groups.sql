-- =====================================================
-- 🔍 FETCH WHATSAPP GROUPS DARI DATABASE
-- =====================================================
-- Script untuk melihat semua group yang tersedia
-- dari WhatsApp API yang baru
-- =====================================================

-- STEP 1: Cek Provider yang Aktif
SELECT 
  id,
  name,
  api_url,
  is_active,
  created_at,
  updated_at
FROM whatsapp_providers
WHERE is_active = true;

-- STEP 2: Cek API Key yang Aktif
SELECT 
  id,
  provider_id,
  is_active,
  created_at
FROM whatsapp_api_keys
WHERE is_active = true;

-- STEP 3: Cek Group Configurations yang Tersimpan
SELECT 
  id,
  name,
  settings->>'default_group_id' as default_group_id,
  settings->'group_configurations' as group_configurations,
  settings->'group_configurations'->>'rental_orders' as rental_orders_group,
  settings->'group_configurations'->>'purchase_orders' as purchase_orders_group,
  settings->'group_configurations'->>'flash_sales' as flash_sales_group
FROM whatsapp_providers
WHERE is_active = true;

-- =====================================================
-- 📝 CATATAN:
-- =====================================================
-- Untuk melihat SEMUA groups yang tersedia dari API:
-- 1. Login ke Admin Panel: https://jbalwikobra-com-digid-digitalindo.vercel.app/admin/whatsapp-settings
-- 2. Scroll ke bagian "Group Configurations"
-- 3. Klik tombol "Fetch Groups" untuk load dari API
-- 4. Pilih group "NEW ORDERAN WEBSITE" dari dropdown
-- 5. Set untuk kategori yang diinginkan (Rental/Purchase/Flash)
--
-- ATAU gunakan endpoint API dengan admin auth token:
-- GET /api/admin-whatsapp-groups
-- Headers: { Authorization: "Bearer <admin-token>" }
-- =====================================================

-- =====================================================
-- 🔄 SQL UNTUK UPDATE GROUP ID
-- =====================================================
-- Setelah tahu Group ID dari "NEW ORDERAN WEBSITE",
-- jalankan salah satu query berikut:

-- Update DEFAULT group:
-- UPDATE whatsapp_providers
-- SET settings = jsonb_set(
--   COALESCE(settings, '{}'::jsonb),
--   '{default_group_id}',
--   '"GROUP_ID_BARU@g.us"'
-- )
-- WHERE is_active = true;

-- Update RENTAL ORDERS group:
-- UPDATE whatsapp_providers
-- SET settings = jsonb_set(
--   COALESCE(settings, '{}'::jsonb),
--   '{group_configurations,rental_orders}',
--   '"GROUP_ID_BARU@g.us"'
-- )
-- WHERE is_active = true;

-- Update PURCHASE ORDERS group:
-- UPDATE whatsapp_providers
-- SET settings = jsonb_set(
--   COALESCE(settings, '{}'::jsonb),
--   '{group_configurations,purchase_orders}',
--   '"GROUP_ID_BARU@g.us"'
-- )
-- WHERE is_active = true;

-- =====================================================
