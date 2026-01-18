const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = (process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/[\r\n]+/g, '');
const supabaseAnonKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim().replace(/[\r\n]+/g, '');

async function testWithExactFrontendSetup() {
  // Create client exactly like frontend
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    },
    global: {
      headers: {
        'x-client-info': 'jbalwikobra-web'
      }
    },
    db: {
      schema: 'public'
    }
  });
  
  console.log('Signing in...');
  await supabase.auth.signInWithPassword({
    email: 'admin@jbalwikobra.com',
    password: '$#jbAlwikobra2025'
  });
  
  console.log('\nTesting update with .select()...');
  const { data, error } = await supabase
    .from('products')
    .update({ price: 50000, updated_at: new Date().toISOString() })
    .eq('id', 'cc33f6bd-8db4-4be3-a769-422b233552a6')
    .select();
  
  console.log('Result:', { data, error });
  
  console.log('\nTesting update with .select("*")...');
  const { data: data2, error: error2 } = await supabase
    .from('products')
    .update({ price: 55000, updated_at: new Date().toISOString() })
    .eq('id', 'cc33f6bd-8db4-4be3-a769-422b233552a6')
    .select('*');
  
  console.log('Result:', { data: data2, error: error2 });
}

testWithExactFrontendSetup().catch(console.error);
