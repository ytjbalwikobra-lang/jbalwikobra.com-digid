// Check Supabase egress efficiency for notification system
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeEgressEfficiency() {
  console.log('\n📊 SUPABASE EGRESS EFFICIENCY ANALYSIS\n');
  
  // Count total notifications
  const { count: totalNotifs, error: countError } = await supabase
    .from('admin_notifications')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Error counting notifications:', countError);
    return;
  }
  
  console.log(`📦 Total Notifications: ${totalNotifs}`);
  
  // Get sample notification to estimate size
  const { data: sample, error: sampleError } = await supabase
    .from('admin_notifications')
    .select('*')
    .limit(1)
    .single();
  
  if (sampleError) {
    console.error('❌ Error fetching sample:', sampleError);
    return;
  }
  
  const sampleSize = JSON.stringify(sample).length;
  console.log(`📏 Average Notification Size: ~${sampleSize} bytes`);
  
  // Calculate egress scenarios
  console.log('\n🔍 EGRESS SCENARIOS:\n');
  
  // Old approach: 200 notifications per request
  const oldLimit = 200;
  const oldEgressPerRequest = (oldLimit * sampleSize) / 1024; // KB
  console.log(`❌ OLD: Fetching ${oldLimit} notifications`);
  console.log(`   Egress per request: ${oldEgressPerRequest.toFixed(2)} KB`);
  console.log(`   With 30s cache: ~${((oldEgressPerRequest * 120) / 1024).toFixed(2)} MB per hour per user`);
  
  // New approach: 50 notifications per request
  const newLimit = 50;
  const newEgressPerRequest = (newLimit * sampleSize) / 1024; // KB
  console.log(`\n✅ NEW: Fetching ${newLimit} notifications`);
  console.log(`   Egress per request: ${newEgressPerRequest.toFixed(2)} KB`);
  console.log(`   With 5min cache: ~${((newEgressPerRequest * 12) / 1024).toFixed(2)} MB per hour per user`);
  
  const savings = ((oldEgressPerRequest * 120) - (newEgressPerRequest * 12)) / (oldEgressPerRequest * 120) * 100;
  console.log(`\n💰 SAVINGS: ${savings.toFixed(1)}% reduction in egress!`);
  
  // Estimate monthly egress
  console.log('\n📈 MONTHLY ESTIMATES (10 active admins):');
  const hoursPerMonth = 730; // ~30.4 days
  const activeAdmins = 10;
  
  const oldMonthly = (oldEgressPerRequest * 120 * hoursPerMonth * activeAdmins) / 1024 / 1024; // GB
  const newMonthly = (newEgressPerRequest * 12 * hoursPerMonth * activeAdmins) / 1024 / 1024; // GB
  
  console.log(`❌ OLD: ${oldMonthly.toFixed(2)} GB/month`);
  console.log(`✅ NEW: ${newMonthly.toFixed(2)} GB/month`);
  console.log(`💰 SAVED: ${(oldMonthly - newMonthly).toFixed(2)} GB/month\n`);
  
  // Check for potential issues
  console.log('⚠️  RECOMMENDATIONS:\n');
  
  if (totalNotifs > 1000) {
    console.log('📌 Consider archiving old notifications (older than 90 days)');
  }
  
  console.log('📌 Use Supabase realtime subscriptions instead of polling');
  console.log('📌 Implement pagination with offset/cursor for large datasets');
  console.log('📌 Add ETag/If-None-Match headers for conditional requests');
  console.log('📌 Enable gzip compression on API responses');
  console.log('📌 Monitor Supabase dashboard for actual egress metrics\n');
}

analyzeEgressEfficiency().catch(console.error);
