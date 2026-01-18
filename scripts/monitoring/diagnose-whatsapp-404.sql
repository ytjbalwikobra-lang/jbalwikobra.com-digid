-- =====================================================
-- 🔍 DIAGNOSE WHATSAPP 404 ERROR
-- =====================================================
-- This script helps identify why /api/admin-whatsapp-groups
-- returns 404 error
-- =====================================================

-- STEP 1: Check if whatsapp_providers table exists and has data
SELECT 
  'whatsapp_providers' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_active = true) as active_records
FROM whatsapp_providers;

-- STEP 2: Check active provider details
SELECT 
  id,
  name,
  display_name,
  api_url,
  base_url,
  is_active,
  created_at,
  settings
FROM whatsapp_providers
WHERE is_active = true
ORDER BY created_at DESC;

-- STEP 3: Check if API keys exist for active provider
SELECT 
  wak.id,
  wak.provider_id,
  wak.key_name,
  wak.is_active,
  wak.is_primary,
  wp.name as provider_name,
  wp.display_name as provider_display_name
FROM whatsapp_api_keys wak
JOIN whatsapp_providers wp ON wak.provider_id = wp.id
WHERE wp.is_active = true
ORDER BY wak.is_primary DESC, wak.created_at DESC;

-- =====================================================
-- 📊 INTERPRETATION OF RESULTS
-- =====================================================
-- 
-- CASE 1: whatsapp_providers has 0 total_records
--   ❌ PROBLEM: No provider configured at all
--   ✅ FIX: Run the setup script below (Section A)
-- 
-- CASE 2: whatsapp_providers has records but 0 active_records
--   ❌ PROBLEM: Provider exists but not activated
--   ✅ FIX: Run activation script below (Section B)
--
-- CASE 3: Active provider exists but no API keys in Step 3
--   ❌ PROBLEM: Provider is active but has no API key
--   ✅ FIX: Add API key via Admin Panel or run Section C
--
-- CASE 4: Everything shows up correctly
--   ✅ API should work! 404 might be different issue
--   Check: Admin authentication token validity
-- =====================================================


-- =====================================================
-- SECTION A: CREATE PROVIDER IF NONE EXISTS
-- =====================================================
-- Run this ONLY if Step 1 shows 0 total_records

-- INSERT INTO whatsapp_providers (
--   name,
--   display_name,
--   api_url,
--   base_url,
--   is_active,
--   send_message_endpoint,
--   async_send_message_endpoint,
--   phone_field_name,
--   key_field_name,
--   message_field_name,
--   message_id_field,
--   settings
-- ) VALUES (
--   'notifapi',
--   'NotifAPI',
--   'https://notifapi.com',
--   'https://notifapi.com',
--   true,
--   '/api/send_message',
--   '/api/async_send_message',
--   'phone_no',
--   'key',
--   'message',
--   'message_id',
--   jsonb_build_object(
--     'group_send_endpoint', '/api/send_group_message',
--     'group_id_field_name', 'group_id',
--     'list_groups_endpoint', '/api/get_group_id',
--     'list_groups_method', 'GET',
--     'list_groups_auth_mode', 'token',
--     'groups_array_field', 'results',
--     'group_name_field', 'subject',
--     'default_group_id', ''
--   )
-- );


-- =====================================================
-- SECTION B: ACTIVATE EXISTING PROVIDER
-- =====================================================
-- Run this if provider exists but is_active = false

-- UPDATE whatsapp_providers
-- SET is_active = true
-- WHERE name = 'notifapi';  -- Change to your provider name


-- =====================================================
-- SECTION C: ADD API KEY FOR PROVIDER
-- =====================================================
-- Run this if provider is active but has no API key
-- REPLACE 'YOUR_API_KEY_HERE' with actual API key

-- INSERT INTO whatsapp_api_keys (
--   provider_id,
--   key_name,
--   api_key,
--   is_active,
--   is_primary
-- )
-- SELECT 
--   id,
--   'Primary API Key',
--   'YOUR_API_KEY_HERE',  -- ⚠️ REPLACE THIS
--   true,
--   true
-- FROM whatsapp_providers
-- WHERE is_active = true
-- LIMIT 1;


-- =====================================================
-- VERIFICATION: Run after making changes
-- =====================================================
-- This should show your provider with API key

SELECT 
  wp.name as provider,
  wp.display_name,
  wp.is_active as provider_active,
  wak.key_name,
  wak.is_active as key_active,
  wak.is_primary,
  wp.settings->>'default_group_id' as default_group
FROM whatsapp_providers wp
LEFT JOIN whatsapp_api_keys wak ON wp.id = wak.provider_id
WHERE wp.is_active = true;

