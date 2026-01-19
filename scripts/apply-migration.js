const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  console.log('\n🔧 Applying migration: Add rental notification types\n');
  
  const supabase = createClient(supabaseUrl, serviceKey);
  
  // Read the migration SQL
  const sql = fs.readFileSync('migrations/2026-01-19_add_rental_notification_types.sql', 'utf8');
  
  console.log('Migration SQL:');
  console.log('─'.repeat(60));
  console.log(sql);
  console.log('─'.repeat(60));
  console.log('\nApplying migration...\n');
  
  // Split the SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let successCount = 0;
  let errors = [];
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    // Skip DO blocks and COMMENT statements as they need special handling
    if (statement.includes('DO $$') || statement.includes('COMMENT ON')) {
      console.log(`⏭️  Skipping statement ${i + 1} (requires admin privileges or special handling)`);
      continue;
    }
    
    try {
      console.log(`Executing statement ${i + 1}...`);
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error.message);
        errors.push({ statement: i + 1, error: error.message });
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
        successCount++;
      }
    } catch (e) {
      console.error(`❌ Statement ${i + 1} exception:`, e.message);
      errors.push({ statement: i + 1, error: e.message });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successfully executed: ${successCount} statements`);
  console.log(`❌ Failed: ${errors.length} statements`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach(e => {
      console.log(`  Statement ${e.statement}: ${e.error}`);
    });
  }
  
  // Test if the constraint was updated by trying to insert a test notification
  console.log('\n🧪 Testing new constraint...\n');
  
  const testNotif = {
    type: 'paid_rent',
    title: 'Test Rental Notification',
    message: 'This is a test',
    is_read: true,
    created_at: new Date().toISOString()
  };
  
  const { data: testData, error: testError } = await supabase
    .from('admin_notifications')
    .insert(testNotif)
    .select()
    .single();
  
  if (testError) {
    console.error('❌ Test failed - constraint not updated:', testError.message);
    console.log('\n⚠️  You may need to run the SQL manually in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/sql/new');
  } else {
    console.log('✅ Test passed - paid_rent type is now allowed!');
    console.log('   Test notification ID:', testData.id);
    
    // Clean up test notification
    await supabase.from('admin_notifications').delete().eq('id', testData.id);
    console.log('   Test notification deleted');
  }
}

applyMigration().catch(console.error);
