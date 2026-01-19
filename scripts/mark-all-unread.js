// Mark all paid notifications as unread for testing
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function markAllUnread() {
  console.log('\n🔄 MARKING ALL NOTIFICATIONS AS UNREAD\n');
  
  // Update all notifications to be unread
  const { data, error } = await supabase
    .from('admin_notifications')
    .update({ is_read: false })
    .neq('id', '00000000-0000-0000-0000-000000000000') // Update all
    .select();
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`✅ Marked ${data?.length || 0} notifications as unread`);
  
  // Show breakdown by type
  const byType = {};
  data?.forEach(n => {
    byType[n.type] = (byType[n.type] || 0) + 1;
  });
  
  console.log('\nBy type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
}

markAllUnread().catch(console.error);
