/**
 * Apply sold_channel migration to Supabase
 * Run: node scripts/apply-sold-channel-migration.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'public' }
});

async function applyMigration() {
  console.log('🔄 Adding sold_channel column to products table...');
  console.log('URL:', SUPABASE_URL);
  
  // Test connection first by getting table info
  const { data: testSelect, error: testError } = await supabase
    .from('products')
    .select('id')
    .limit(1);
    
  if (testError) {
    console.error('❌ Connection failed:', testError.message);
    process.exit(1);
  }
  console.log('✅ Connected to Supabase');

  // Try inserting a test record with sold_channel to see if column exists
  // If column doesn't exist, this approach won't work - need direct SQL
  
  // Option 1: Try updating with sold_channel to test if exists
  const { data: updateTest, error: updateError } = await supabase
    .from('products')
    .update({ sold_channel: null })
    .eq('id', '00000000-0000-0000-0000-000000000000')
    .select();
    
  if (updateError) {
    if (updateError.message.includes('sold_channel')) {
      console.log('❌ Column sold_channel does not exist.');
      console.log('');
      console.log('📋 Please run this SQL in your Supabase Dashboard SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/sql');
      console.log('');
      console.log('------------------------------------------');
      console.log('ALTER TABLE public.products');
      console.log("ADD COLUMN IF NOT EXISTS sold_channel text;");
      console.log('');
      console.log("COMMENT ON COLUMN public.products.sold_channel IS 'Sales source: web | wa (NULL = active)';");
      console.log('------------------------------------------');
      process.exit(1);
    }
    // Other errors are fine (like no matching row)
  }
  
  // If we got here, column exists
  console.log('✅ Column sold_channel already exists!');
  
  // Verify by selecting a product with the column
  const { data: sample, error: sampleErr } = await supabase
    .from('products')
    .select('id, name, sold_channel')
    .limit(3);
    
  if (!sampleErr) {
    console.log('📊 Sample products:', sample);
  }
}

applyMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
