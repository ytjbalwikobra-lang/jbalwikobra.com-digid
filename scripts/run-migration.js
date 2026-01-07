#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260107_complete_price_editing_fix.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Get credentials
    const envPath = path.join(__dirname, '..', '.env.production');
    const envFile = fs.readFileSync(envPath, 'utf8');
    
    const urlMatch = envFile.match(/SUPABASE_URL="?([^"\r\n]+)/);
    const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="?([^"\r\n]+)/);
    
    if (!urlMatch || !keyMatch) {
      console.error('❌ Could not find Supabase credentials in .env.production');
      process.exit(1);
    }
    
    const url = urlMatch[1].replace(/\\r\\n$/, '').replace(/\r\n$/, '').trim();
    const key = keyMatch[1].trim();

    console.log('🔗 Connecting to Supabase...');
    console.log('   URL:', url);
    console.log('');

    const supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    console.log('🚀 Executing migration SQL...');
    console.log('   File:', sqlPath);
    console.log('');

    // Split SQL into individual statements
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      try {
        // Use rpc to execute raw SQL if available
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.log(`❌ Statement ${i + 1} failed:`, error.message);
          errorCount++;
        } else {
          successCount++;
          if (data) {
            console.log(`✅ Statement ${i + 1} executed`);
          }
        }
      } catch (err) {
        console.log(`⚠️  Statement ${i + 1} - ${err.message}`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log(`📊 Results: ${successCount} successful, ${errorCount} failed`);
    console.log('='.repeat(80));
    console.log('');
    
    if (errorCount > 0 || successCount === 0) {
      console.log('⚠️  Direct SQL execution not fully supported.');
      console.log('');
      console.log('📋 Please run this migration manually:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/xeithuvgldzxnggxadri/sql/new');
      console.log('   2. Copy the content from: supabase/migrations/20260107_complete_price_editing_fix.sql');
      console.log('   3. Paste and click "Run"');
      console.log('');
      console.log('Or use this command to display the SQL:');
      console.log('   cat supabase/migrations/20260107_complete_price_editing_fix.sql');
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('   1. Log into your admin panel');
      console.log('   2. Go to Products page');
      console.log('   3. Try editing a price');
      console.log('   4. It should work now! 🎉');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.log('');
    console.log('Please run the migration manually in Supabase Dashboard:');
    console.log('   Dashboard → SQL Editor → New Query');
    console.log('   Then paste the content from:');
    console.log('   supabase/migrations/20260107_complete_price_editing_fix.sql');
    process.exit(1);
  }
}

runMigration();
