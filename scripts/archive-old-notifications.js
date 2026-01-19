// Archive notifications older than 90 days to reduce active table size
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function archiveOldNotifications() {
  console.log('\n🗄️  ARCHIVING OLD NOTIFICATIONS\n');
  
  // Calculate cutoff date (90 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffISO = cutoffDate.toISOString();
  
  console.log(`📅 Archiving notifications older than: ${cutoffDate.toLocaleDateString('id-ID')}`);
  
  // Count old notifications
  const { count, error: countError } = await supabase
    .from('admin_notifications')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', cutoffISO);
  
  if (countError) {
    console.error('❌ Error counting old notifications:', countError);
    return;
  }
  
  console.log(`📦 Found ${count} old notifications to archive`);
  
  if (count === 0) {
    console.log('✅ No notifications to archive!\n');
    return;
  }
  
  // Soft delete by marking them (don't actually delete, just mark as archived)
  const { error: updateError } = await supabase
    .from('admin_notifications')
    .update({ 
      metadata: { archived: true, archived_at: new Date().toISOString() }
    })
    .lt('created_at', cutoffISO)
    .is('metadata->archived', null); // Only mark if not already archived
  
  if (updateError) {
    console.error('❌ Error archiving notifications:', updateError);
    return;
  }
  
  console.log(`✅ Archived ${count} notifications`);
  console.log('💡 TIP: Update queries to filter out archived notifications: .is("metadata->archived", null)\n');
}

archiveOldNotifications().catch(console.error);
