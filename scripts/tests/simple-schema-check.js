/**
 * Simple Schema Check for Website Settings
 * 
 * This script queries your website_settings table to see what columns exist
 * and compares with what the code expects.
 * 
 * Usage:
 *   node scripts/simple-schema-check.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing credentials. Create .env.local with:');
  console.error('REACT_APP_SUPABASE_URL=your_url');
  console.error('REACT_APP_SUPABASE_ANON_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Columns the TypeScript code expects
const EXPECTED = [
  'id', 'site_name', 'logo_url', 'favicon_url',
  'contact_email', 'support_email', 'contact_phone', 'whatsapp_number',
  'address', 'business_hours', 'company_description',
  'facebook_url', 'instagram_url', 'tiktok_url', 'twitter_url', 'youtube_url',
  'hero_title', 'hero_subtitle',
  'footer_copyright_text', 'newsletter_enabled', 'social_media_enabled',
  'topup_game_url', 'whatsapp_channel_url', 'hero_button_url', 'jual_akun_whatsapp_url',
  'created_at', 'updated_at'
];

async function checkSchema() {
  console.log('🔍 Checking your database schema...\n');
  
  try {
    // Try to fetch one row to see what columns exist
    const { data, error } = await supabase
      .from('website_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Error:', error.message);
      console.log('\n💡 Check:');
      console.log('1. Credentials are correct');
      console.log('2. Table "website_settings" exists');
      console.log('3. RLS policies allow SELECT');
      process.exit(1);
    }
    
    const actualColumns = data ? Object.keys(data) : [];
    
    if (actualColumns.length === 0) {
      console.log('⚠️  Table exists but is empty or has no accessible columns');
      console.log('Cannot determine schema from data.');
      console.log('\nTry running the full diagnostic: node scripts/check-website-settings-schema.js');
      process.exit(1);
    }
    
    console.log('✅ Connected successfully!\n');
    console.log('📊 Your current columns (' + actualColumns.length + '):');
    actualColumns.sort().forEach(col => console.log('   ✓', col));
    
    const missing = EXPECTED.filter(col => !actualColumns.includes(col));
    
    console.log('\n🔎 Analysis:');
    console.log(`   Existing: ${actualColumns.length}/${EXPECTED.length}`);
    console.log(`   Missing: ${missing.length}`);
    
    if (missing.length > 0) {
      console.log('\n❌ Missing columns:');
      missing.forEach(col => console.log('   ⚠️ ', col));
      
      console.log('\n📝 Next steps:');
      console.log('1. Review: supabase/migrations/20251227_add_missing_website_settings_columns.sql');
      console.log('2. Apply it to your database');
      console.log('3. Or run: node scripts/check-website-settings-schema.js');
      console.log('   (generates custom migration based on YOUR specific database)');
    } else {
      console.log('\n🎉 All expected columns exist!');
      console.log('Your schema is up to date.');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkSchema();
