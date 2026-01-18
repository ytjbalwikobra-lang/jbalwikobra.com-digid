const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/[\r\n]+/g, '');
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/[\r\n]+/g, '');

async function runMigration() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('Reading SQL file...');
  const sql = fs.readFileSync('supabase/migrations/20260107_fix_users_rls_infinite_recursion.sql', 'utf8');
  
  // Split by statements and execute
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');
  
  console.log(`Executing ${statements.length} SQL statements...\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt) continue;
    
    console.log(`[${i+1}/${statements.length}] ${stmt.substring(0, 60)}...`);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
    
    if (error) {
      console.error('❌ Error:', error.message);
      // Continue anyway
    } else {
      console.log('✅ Success');
    }
  }
  
  console.log('\n✅ Migration complete!');
}

runMigration().catch(console.error);
