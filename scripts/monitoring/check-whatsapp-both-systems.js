#!/usr/bin/env node

/**
 * Direct database check for BOTH WhatsApp systems
 * Checks both admin_whatsapp_settings AND whatsapp_providers/whatsapp_api_keys
 */

const https = require('https');

// Production Supabase URL (known from code)
const SUPABASE_URL = 'https://wuqqjzzgdltqavmafxfq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('\n❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
  console.log('\n💡 User, tolong jalankan:');
  console.log('   1. Buka Supabase Dashboard → Project jbalwikobra');
  console.log('   2. Settings → API → service_role key');
  console.log('   3. Copy key');
  console.log('   4. Run:');
  console.log('      export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."');
  console.log('   5. Jalankan script ini lagi\n');
  process.exit(1);
}

function query(table, select = '*') {
  return new Promise((resolve, reject) => {
    const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
    url.searchParams.append('select', select);
    
    const options = {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('='.repeat(70));
  console.log('🔍 CHECKING WHATSAPP CONFIGURATION - BOTH SYSTEMS');
  console.log('='.repeat(70));
  console.log(`\n📡 Querying: ${SUPABASE_URL}`);
  
  // Check System 1: admin_whatsapp_settings (old system?)
  console.log('\n' + '='.repeat(70));
  console.log('📋 SYSTEM 1: admin_whatsapp_settings (Legacy?)');
  console.log('='.repeat(70));
  
  try {
    const settings = await query('admin_whatsapp_settings');
    
    if (!settings || settings.length === 0) {
      console.log('\n❌ Table empty or tidak ada');
    } else {
      console.log(`\n✅ Found ${settings.length} record(s):`);
      settings.forEach((s, idx) => {
        console.log(`\n  Record #${idx + 1}:`);
        console.log(`    ID: ${s.id}`);
        console.log(`    Provider: ${s.provider} ${s.provider !== 'none' ? '✅' : '❌'}`);
        console.log(`    Base URL: ${s.base_url || 'missing'} ${s.base_url ? '✅' : '❌'}`);
        console.log(`    API Key: ${s.api_key ? '[SET]' : 'missing'} ${s.api_key ? '✅' : '❌'}`);
        console.log(`    Session: ${s.session || 'none'}`);
        console.log(`    Is Active: ${s.is_active} ${s.is_active ? '✅' : '❌'}`);
        console.log(`    Group ID: ${s.default_group_id || 'missing'}`);
        console.log(`    Created: ${s.created_at}`);
      });
    }
  } catch (err) {
    console.log(`\n❌ Error: ${err.message}`);
  }
  
  // Check System 2: whatsapp_providers + whatsapp_api_keys (new system)
  console.log('\n' + '='.repeat(70));
  console.log('📋 SYSTEM 2: whatsapp_providers + whatsapp_api_keys (Current)');
  console.log('='.repeat(70));
  
  try {
    const providers = await query('whatsapp_providers');
    
    if (!providers || providers.length === 0) {
      console.log('\n❌ No providers found');
    } else {
      console.log(`\n✅ Found ${providers.length} provider(s):`);
      
      for (const p of providers) {
        console.log(`\n  Provider: ${p.name || p.id}`);
        console.log(`    ID: ${p.id}`);
        console.log(`    Is Active: ${p.is_active} ${p.is_active ? '✅' : '❌'}`);
        console.log(`    API URL: ${p.api_url || p.base_url || 'missing'}`);
        console.log(`    Send Endpoint: ${p.send_message_endpoint || 'missing'}`);
        console.log(`    Phone Field: ${p.phone_field_name || 'missing'}`);
        console.log(`    Key Field: ${p.key_field_name || 'missing'}`);
        console.log(`    Created: ${p.created_at}`);
        
        // Get API keys for this provider
        try {
          const keys = await query('whatsapp_api_keys', '*');
          const providerKeys = keys.filter(k => k.provider_id === p.id);
          
          if (providerKeys.length === 0) {
            console.log(`    ⚠️  No API keys configured`);
          } else {
            console.log(`    Keys: ${providerKeys.length}`);
            providerKeys.forEach((k, i) => {
              console.log(`      Key #${i + 1}: ${k.is_active ? '✅ Active' : '❌ Inactive'} ${k.is_primary ? '(PRIMARY)' : ''}`);
            });
          }
        } catch (keyErr) {
          console.log(`    ❌ Error getting keys: ${keyErr.message}`);
        }
      }
    }
  } catch (err) {
    console.log(`\n❌ Error: ${err.message}`);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📌 CONCLUSION');
  console.log('='.repeat(70));
  console.log(`
Jika System 1 (admin_whatsapp_settings) kosong/none:
  → Kemungkinan sudah migrasi ke System 2

Jika System 2 (whatsapp_providers) kosong:
  → WhatsApp memang belum configured

Jika System 2 ada data tapi is_active=false:
  → Perlu aktivasi via admin panel atau SQL
  `);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
