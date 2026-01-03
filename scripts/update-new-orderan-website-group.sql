-- =====================================================
-- 🔄 UPDATE GROUP ID KE "NEW ORDERAN WEBSITE"
-- =====================================================
-- Group: NEW ORDERAN WEBSITE
-- Group ID: 120363422735817445@g.us
-- Generated: 3 Januari 2026
-- =====================================================

-- STEP 1: Verifikasi konfigurasi saat ini
SELECT 
  id,
  name,
  settings->>'default_group_id' as current_default_group,
  settings->'group_configurations'->>'rental_orders' as current_rental_group,
  settings->'group_configurations'->>'purchase_orders' as current_purchase_group,
  settings->'group_configurations'->>'flash_sales' as current_flash_group,
  is_active
FROM whatsapp_providers
WHERE name = 'woo-wa';

-- =====================================================
-- STEP 2: UPDATE DEFAULT GROUP ID
-- =====================================================

UPDATE whatsapp_providers
SET 
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{default_group_id}',
    '"120363422735817445@g.us"'
  ),
  updated_at = NOW()
WHERE name = 'woo-wa' AND is_active = true;

-- =====================================================
-- STEP 3: UPDATE RENTAL ORDERS GROUP
-- =====================================================

UPDATE whatsapp_providers
SET 
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{group_configurations,rental_orders}',
    '"120363422735817445@g.us"'
  ),
  updated_at = NOW()
WHERE name = 'woo-wa' AND is_active = true;

-- =====================================================
-- STEP 4: UPDATE PURCHASE ORDERS GROUP
-- =====================================================

UPDATE whatsapp_providers
SET 
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{group_configurations,purchase_orders}',
    '"120363422735817445@g.us"'
  ),
  updated_at = NOW()
WHERE name = 'woo-wa' AND is_active = true;

-- =====================================================
-- STEP 5: UPDATE FLASH SALES GROUP
-- =====================================================

UPDATE whatsapp_providers
SET 
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{group_configurations,flash_sales}',
    '"120363422735817445@g.us"'
  ),
  updated_at = NOW()
WHERE name = 'woo-wa' AND is_active = true;

-- =====================================================
-- STEP 6: UPDATE GENERAL NOTIFICATIONS GROUP
-- =====================================================

UPDATE whatsapp_providers
SET 
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{group_configurations,general_notifications}',
    '"120363422735817445@g.us"'
  ),
  updated_at = NOW()
WHERE name = 'woo-wa' AND is_active = true;

-- =====================================================
-- STEP 7: VERIFIKASI PERUBAHAN
-- =====================================================

SELECT 
  id,
  name,
  settings->>'default_group_id' as new_default_group,
  settings->'group_configurations'->>'rental_orders' as new_rental_group,
  settings->'group_configurations'->>'purchase_orders' as new_purchase_group,
  settings->'group_configurations'->>'flash_sales' as new_flash_group,
  settings->'group_configurations'->>'general_notifications' as new_general_group,
  updated_at
FROM whatsapp_providers
WHERE name = 'woo-wa';

-- =====================================================
-- ✅ SUMMARY
-- =====================================================
-- 
-- Group yang diupdate: NEW ORDERAN WEBSITE
-- Group ID: 120363422735817445@g.us
-- 
-- Perubahan:
-- ✓ Default Group ID
-- ✓ Rental Orders Group
-- ✓ Purchase Orders Group  
-- ✓ Flash Sales Group
-- ✓ General Notifications Group
--
-- Old Group ID: 120363421819020887@g.us
-- New Group ID: 120363422735817445@g.us
--
-- =====================================================
