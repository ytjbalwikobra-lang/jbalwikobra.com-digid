#!/usr/bin/env node

/**
 * Check WhatsApp Configuration in Database
 * This script queries the admin_whatsapp_settings table directly
 */

const https = require('https');

// Get Supabase credentials from environment or use production values
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://wuqqjzzgdltqavmafxfq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY not set in environment');
  console.log('\n💡 Set it first:');
  console.log('   export SUPABASE_SERVICE_ROLE_KEY="your_service_key"');
  process.exit(1);
}

const url = new URL('/rest/v1/admin_whatsapp_settings', SUPABASE_URL);
url.searchParams.append('select', '*');

const options = {
  method: 'GET',
  headers: {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json'
  }
};

console.log('='.repeat(70));
console.log('🔍 CHECKING WHATSAPP CONFIGURATION');
console.log('='.repeat(70));
console.log(`\n📡 Querying: ${SUPABASE_URL}/rest/v1/admin_whatsapp_settings`);

https.get(url, options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`\n❌ HTTP ${res.statusCode}: ${data}`);
      process.exit(1);
    }
    
    try {
      const settings = JSON.parse(data);
      
      if (!settings || settings.length === 0) {
        console.log('\n❌ NO RECORDS in admin_whatsapp_settings table!');
        console.log('\n💡 SOLUSI: Run this SQL in Supabase Dashboard:');
        console.log(`
INSERT INTO admin_whatsapp_settings (
  provider, base_url, api_key, session, is_active, default_group_id
) VALUES (
  'fonnte',
  'https://api.fonnte.com',
  'YOUR_FONNTE_TOKEN',
  NULL,
  true,
  'YOUR_GROUP_ID'
);
        `);
      } else {
        console.log(`\n✅ Found ${settings.length} record(s)`);
        console.log('\n' + '='.repeat(70));
        
        settings.forEach((s, idx) => {
          console.log(`\n📋 Record #${idx + 1}:`);
          console.log(`  ID: ${s.id}`);
          console.log(`  Provider: ${s.provider} ${s.provider === 'none' ? '❌' : '✅'}`);
          console.log(`  Base URL: ${s.base_url || 'missing'} ${s.base_url ? '✅' : '❌'}`);
          console.log(`  API Key: ${s.api_key ? '[SET]' : 'missing'} ${s.api_key ? '✅' : '❌'}`);
          console.log(`  Session: ${s.session || 'none'}`);
          console.log(`  Is Active: ${s.is_active} ${s.is_active ? '✅' : '❌'}`);
          console.log(`  Group ID: ${s.default_group_id || 'missing'} ${s.default_group_id ? '✅' : '⚠️'}`);
          console.log(`  Created: ${s.created_at}`);
        });
        
        const s = settings[0];
        const needsConfig = (
          s.provider === 'none' ||
          !s.is_active ||
          !s.api_key
        );
        
        if (needsConfig) {
          console.log('\n' + '='.repeat(70));
          console.log('⚠️  WHATSAPP NOT CONFIGURED!');
          console.log('='.repeat(70));
          console.log('\n📝 Run this SQL in Supabase Dashboard → SQL Editor:');
          console.log(`
UPDATE admin_whatsapp_settings
SET
  provider = 'fonnte',
  base_url = 'https://api.fonnte.com',
  api_key = 'YOUR_FONNTE_TOKEN',
  is_active = true,
  default_group_id = 'YOUR_GROUP_ID'
WHERE id = '${s.id}';
          `);
          console.log('\n🔗 Get Fonnte Token: https://fonnte.com → Dashboard → API Token');
          console.log('📱 Get Group ID: Forward message dari grup ke nomor Fonnte');
        } else {
          console.log('\n' + '='.repeat(70));
          console.log('✅ WhatsApp CONFIGURED and ACTIVE!');
          console.log('='.repeat(70));
        }
      }
      
      console.log('\n' + '='.repeat(70));
    } catch (err) {
      console.error('\n❌ Parse Error:', err.message);
      console.log('Raw response:', data);
    }
  });
}).on('error', (err) => {
  console.error('\n❌ Request Error:', err.message);
  process.exit(1);
});
