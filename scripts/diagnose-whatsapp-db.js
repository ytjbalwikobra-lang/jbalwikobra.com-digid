#!/usr/bin/env node

// Diagnose and fix WhatsApp 404 error by checking database configuration
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '').replace(/[\r\n"]/g, '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\r\n"]/g, '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function diagnose() {
  console.log('🔍 DIAGNOSING WHATSAPP 404 ERROR\n');
  console.log('=' . repeat(60));
  
  // Step 1: Check whatsapp_providers
  console.log('\n📊 STEP 1: Checking whatsapp_providers table...\n');
  
  const { data: providers, error: providerError, count } = await supabase
    .from('whatsapp_providers')
    .select('*', { count: 'exact' });
  
  if (providerError) {
    console.error('❌ Error querying whatsapp_providers:', providerError.message);
    return { needsSetup: true, error: providerError };
  }
  
  const activeProviders = providers?.filter(p => p.is_active) || [];
  
  console.log(`Total providers: ${count || 0}`);
  console.log(`Active providers: ${activeProviders.length}`);
  
  if (activeProviders.length === 0) {
    console.log('\n⚠️  NO ACTIVE PROVIDER FOUND!');
    return { needsSetup: true, reason: 'no_active_provider', providers };
  }
  
  const provider = activeProviders[0];
  console.log('\n✅ Active provider found:');
  console.log(`   Name: ${provider.name}`);
  console.log(`   Display Name: ${provider.display_name || 'N/A'}`);
  console.log(`   API URL: ${provider.api_url || provider.base_url}`);
  
  // Step 2: Check whatsapp_api_keys
  console.log('\n📊 STEP 2: Checking whatsapp_api_keys table...\n');
  
  const { data: apiKeys, error: keyError } = await supabase
    .from('whatsapp_api_keys')
    .select('*')
    .eq('provider_id', provider.id);
  
  if (keyError) {
    console.error('❌ Error querying whatsapp_api_keys:', keyError.message);
    return { needsSetup: true, error: keyError, provider };
  }
  
  const activeKeys = apiKeys?.filter(k => k.is_active) || [];
  
  console.log(`Total API keys: ${apiKeys?.length || 0}`);
  console.log(`Active API keys: ${activeKeys.length}`);
  
  if (activeKeys.length === 0) {
    console.log('\n⚠️  NO ACTIVE API KEY FOUND!');
    return { needsSetup: true, reason: 'no_api_key', provider, apiKeys };
  }
  
  const apiKey = activeKeys[0];
  console.log('\n✅ Active API key found:');
  console.log(`   Key Name: ${apiKey.key_name || 'Unnamed'}`);
  console.log(`   Is Primary: ${apiKey.is_primary ? 'Yes' : 'No'}`);
  console.log(`   Created: ${new Date(apiKey.created_at).toLocaleDateString()}`);
  
  // Step 3: Check configuration
  console.log('\n📊 STEP 3: Checking configuration...\n');
  
  const settings = provider.settings || {};
  console.log('Provider settings:');
  console.log(`   Default Group ID: ${settings.default_group_id || '(not set)'}`);
  console.log(`   List Groups Endpoint: ${settings.list_groups_endpoint || '(not set)'}`);
  console.log(`   Groups Array Field: ${settings.groups_array_field || '(not set)'}`);
  
  if (settings.group_configurations) {
    console.log('\nGroup configurations:');
    console.log(`   Purchase Orders: ${settings.group_configurations.purchase_orders || '(not set)'}`);
    console.log(`   Rental Orders: ${settings.group_configurations.rental_orders || '(not set)'}`);
    console.log(`   Flash Sales: ${settings.group_configurations.flash_sales || '(not set)'}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ DIAGNOSIS COMPLETE - Configuration looks good!');
  console.log('='.repeat(60));
  console.log('\nIf you\'re still getting 404 errors, the issue might be:');
  console.log('1. Admin authentication token is invalid or expired');
  console.log('2. API endpoint is not deployed on Vercel');
  console.log('3. External WhatsApp API is not accessible');
  
  return { needsSetup: false, provider, apiKey, settings };
}

async function setupProvider() {
  console.log('\n🔧 SETTING UP WHATSAPP PROVIDER...\n');
  
  // Check if provider already exists
  const { data: existing } = await supabase
    .from('whatsapp_providers')
    .select('*')
    .eq('name', 'notifapi')
    .maybeSingle();
  
  if (existing && existing.is_active) {
    console.log('✅ Provider already exists and is active');
    return existing;
  }
  
  if (existing && !existing.is_active) {
    console.log('📝 Activating existing provider...');
    const { data: updated, error } = await supabase
      .from('whatsapp_providers')
      .update({ is_active: true })
      .eq('id', existing.id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error activating provider:', error.message);
      return null;
    }
    
    console.log('✅ Provider activated successfully');
    return updated;
  }
  
  // Create new provider
  console.log('📝 Creating new NotifAPI provider...');
  
  const { data: newProvider, error } = await supabase
    .from('whatsapp_providers')
    .insert({
      name: 'notifapi',
      display_name: 'NotifAPI',
      api_url: 'https://notifapi.com',
      base_url: 'https://notifapi.com',
      is_active: true,
      send_message_endpoint: '/api/send_message',
      async_send_message_endpoint: '/api/async_send_message',
      phone_field_name: 'phone_no',
      key_field_name: 'key',
      message_field_name: 'message',
      message_id_field: 'message_id',
      settings: {
        group_send_endpoint: '/api/send_group_message',
        group_id_field_name: 'group_id',
        list_groups_endpoint: '/api/get_group_id',
        list_groups_method: 'GET',
        list_groups_auth_mode: 'token',
        groups_array_field: 'results',
        group_name_field: 'subject',
        default_group_id: ''
      }
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error creating provider:', error.message);
    return null;
  }
  
  console.log('✅ Provider created successfully');
  return newProvider;
}

async function addApiKey(providerId) {
  console.log('\n🔑 API KEY SETUP REQUIRED\n');
  console.log('To complete the setup, you need to add your WhatsApp API key.');
  console.log('\nYou can do this in two ways:');
  console.log('\n1. Via Admin Panel:');
  console.log('   - Go to: https://your-domain.vercel.app/admin/whatsapp');
  console.log('   - Add your API key in the settings');
  console.log('\n2. Via this script (add API_KEY environment variable):');
  console.log('   - Set API_KEY="your-key-here" in .env.local');
  console.log('   - Run this script again');
  
  const apiKeyFromEnv = process.env.API_KEY;
  if (!apiKeyFromEnv) {
    console.log('\n⚠️  No API_KEY found in environment variables');
    return null;
  }
  
  console.log('\n📝 Adding API key from environment...');
  
  const { data, error } = await supabase
    .from('whatsapp_api_keys')
    .insert({
      provider_id: providerId,
      key_name: 'Primary API Key',
      api_key: apiKeyFromEnv,
      is_active: true,
      is_primary: true
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error adding API key:', error.message);
    return null;
  }
  
  console.log('✅ API key added successfully');
  return data;
}

async function main() {
  try {
    const result = await diagnose();
    
    if (result.needsSetup) {
      console.log('\n' + '='.repeat(60));
      console.log('🔧 SETUP REQUIRED');
      console.log('='.repeat(60));
      
      if (result.reason === 'no_active_provider') {
        const provider = await setupProvider();
        if (provider) {
          await addApiKey(provider.id);
        }
      } else if (result.reason === 'no_api_key') {
        await addApiKey(result.provider.id);
      }
    }
    
    console.log('\n✅ Done! Run this script again to verify the setup.');
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
