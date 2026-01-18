/**
 * Database Schema Diagnostic Script
 * 
 * This script checks your actual Supabase website_settings table
 * and compares it with what the TypeScript code expects.
 * 
 * Usage:
 *   node scripts/check-website-settings-schema.js
 * 
 * It will:
 * 1. Connect to your Supabase database
 * 2. Check the actual schema of website_settings table
 * 3. Compare with expected columns from TypeScript types
 * 4. Generate a custom migration for missing columns only
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please set REACT_APP_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or REACT_APP_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected columns based on TypeScript WebsiteSettings interface
const EXPECTED_COLUMNS = {
  // Core fields
  id: 'uuid',
  site_name: 'text',
  
  // Brand assets
  logo_url: 'text',
  favicon_url: 'text',
  
  // Contact information
  contact_email: 'text',
  support_email: 'text',
  contact_phone: 'text',
  whatsapp_number: 'text',
  address: 'text',
  business_hours: 'text',
  company_description: 'text',
  
  // Social media URLs
  facebook_url: 'text',
  instagram_url: 'text',
  tiktok_url: 'text',
  twitter_url: 'text',
  youtube_url: 'text',
  
  // Hero section
  hero_title: 'text',
  hero_subtitle: 'text',
  
  // Footer settings
  footer_copyright_text: 'text',
  newsletter_enabled: 'boolean',
  social_media_enabled: 'boolean',
  
  // Action URLs
  topup_game_url: 'text',
  whatsapp_channel_url: 'text',
  hero_button_url: 'text',
  jual_akun_whatsapp_url: 'text',
  
  // Metadata
  created_at: 'timestamptz',
  updated_at: 'timestamptz'
};

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema for website_settings table...\n');
  
  try {
    // Query information_schema to get actual columns
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'website_settings'
        ORDER BY ordinal_position;
      `
    });
    
    if (error) {
      // Fallback: Try direct query if RPC doesn't work
      console.log('⚠️  RPC method failed, trying direct query...');
      
      // Try to query the table directly to see what columns exist
      const { data: tableData, error: tableError } = await supabase
        .from('website_settings')
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.error('❌ Error querying database:', tableError.message);
        console.log('\n💡 Suggestion: Check your Supabase credentials and RLS policies');
        process.exit(1);
      }
      
      // If we got data (or null), we can infer columns from the query
      console.log('\n✅ Successfully connected to database');
      console.log('📊 Columns found in website_settings table:');
      
      if (tableData && tableData.length > 0) {
        const actualColumns = Object.keys(tableData[0]);
        analyzeColumns(actualColumns);
      } else {
        // Table exists but is empty - use metadata
        console.log('⚠️  Table is empty, checking PostgreSQL metadata...');
        await checkViaPostgres();
      }
      
      return;
    }
    
    // Process results from information_schema
    const actualColumns = data.map(col => col.column_name);
    console.log('✅ Successfully retrieved schema information\n');
    analyzeColumns(actualColumns, data);
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

async function checkViaPostgres() {
  // Alternative method using a simple SQL query
  const { data, error } = await supabase
    .from('website_settings')
    .select('*')
    .limit(0); // Don't fetch data, just metadata
  
  if (error && error.code === '42P01') {
    console.error('❌ Table "website_settings" does not exist in the database');
    console.log('\n💡 You need to run the initial migration first:');
    console.log('   supabase/migrations/20250829_add_banners_and_settings.sql');
    process.exit(1);
  }
}

function analyzeColumns(actualColumns, columnDetails = null) {
  console.log('📋 Current columns in your database:');
  actualColumns.forEach(col => {
    const detail = columnDetails?.find(d => d.column_name === col);
    if (detail) {
      console.log(`   ✓ ${col} (${detail.data_type})`);
    } else {
      console.log(`   ✓ ${col}`);
    }
  });
  
  console.log('\n🔎 Analyzing against expected schema...\n');
  
  const missingColumns = [];
  const existingColumns = [];
  
  Object.keys(EXPECTED_COLUMNS).forEach(expectedCol => {
    if (actualColumns.includes(expectedCol)) {
      existingColumns.push(expectedCol);
    } else {
      missingColumns.push(expectedCol);
    }
  });
  
  console.log(`✅ Existing columns: ${existingColumns.length}/${Object.keys(EXPECTED_COLUMNS).length}`);
  
  if (missingColumns.length === 0) {
    console.log('\n🎉 SUCCESS! All expected columns exist in your database.');
    console.log('Your schema is up to date.');
    return;
  }
  
  console.log(`❌ Missing columns: ${missingColumns.length}`);
  console.log('\nMissing columns:');
  missingColumns.forEach(col => {
    console.log(`   ⚠️  ${col} (${EXPECTED_COLUMNS[col]})`);
  });
  
  // Generate custom migration
  generateMigration(missingColumns);
}

function generateMigration(missingColumns) {
  console.log('\n📝 Generating custom migration for your database...\n');
  
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const migrationFile = `supabase/migrations/${timestamp}_add_missing_columns_custom.sql`;
  
  let migrationSQL = `-- Custom migration generated for missing columns
-- Generated on: ${new Date().toISOString()}
-- Missing columns: ${missingColumns.length}

`;
  
  migrationSQL += `alter table public.website_settings\n`;
  
  const alterStatements = missingColumns.map(col => {
    const dataType = EXPECTED_COLUMNS[col];
    let defaultValue = '';
    
    if (dataType === 'boolean') {
      defaultValue = ' default true';
    } else if (col === 'updated_at') {
      defaultValue = ' default now()';
    }
    
    return `add column if not exists ${col} ${dataType}${defaultValue}`;
  });
  
  migrationSQL += alterStatements.join(',\n');
  migrationSQL += ';\n\n';
  
  // Add comments
  migrationSQL += '-- Add descriptive comments\n';
  const comments = {
    support_email: 'Support email address for customer inquiries',
    business_hours: 'Business operating hours',
    company_description: 'Company description text',
    twitter_url: 'Twitter/X profile URL',
    youtube_url: 'YouTube channel URL',
    footer_copyright_text: 'Copyright text displayed in footer',
    newsletter_enabled: 'Enable/disable newsletter subscription feature',
    social_media_enabled: 'Enable/disable social media links',
    topup_game_url: 'URL for top-up game services',
    whatsapp_channel_url: 'WhatsApp channel URL for announcements',
    hero_button_url: 'Main call-to-action button URL on hero section'
  };
  
  missingColumns.forEach(col => {
    if (comments[col]) {
      migrationSQL += `comment on column public.website_settings.${col} is '${comments[col]}';\n`;
    }
  });
  
  // Write migration file
  const fullPath = path.join(process.cwd(), migrationFile);
  fs.writeFileSync(fullPath, migrationSQL);
  
  console.log(`✅ Custom migration created: ${migrationFile}`);
  console.log('\n📋 Next steps:');
  console.log('1. Review the generated migration file');
  console.log('2. Apply it using one of these methods:');
  console.log('   • Supabase CLI: supabase db push');
  console.log('   • Dashboard: Copy SQL to Supabase SQL Editor');
  console.log('   • Direct: psql YOUR_DATABASE_URL -f ' + migrationFile);
  console.log('\n💡 The migration uses "add column if not exists" so it\'s safe to run multiple times');
}

// Run the diagnostic
checkDatabaseSchema()
  .then(() => {
    console.log('\n✨ Diagnostic complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
