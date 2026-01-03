const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xeithuvgldzxnggxadri.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXRodXZnbGR6eG5nZ3hhZHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MzMyMSwiZXhwIjoyMDcyMDM5MzIxfQ.pLPA5-pZ4jpjzhsevyMJoRLmLYbPbESfMbt14PBMXd8'
);

async function checkLogs() {
  console.log('Checking most recent WhatsApp logs (last 10 minutes)...\n');
  
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data: logs, error } = await supabase
    .from('whatsapp_message_logs')
    .select('*')
    .gte('created_at', tenMinutesAgo)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!logs || logs.length === 0) {
    console.log('❌ NO WhatsApp logs in the last 10 minutes!');
    console.log('This means sendOrderPaidNotification is NOT being called or NOT sending messages.');
    return;
  }
  
  console.log(`✅ Found ${logs.length} WhatsApp logs in last 10 minutes:\n`);
  
  logs.forEach((log, i) => {
    console.log(`\n=== Log ${i + 1} (${log.created_at}) ===`);
    console.log('Success:', log.success);
    console.log('Phone:', log.phone_number);
    console.log('Context:', log.context_type, '-', log.context_id);
    console.log('Response Status:', log.response_status);
    
    if (!log.success) {
      console.log('\n❌ FAILED - Response:');
      console.log(JSON.stringify(log.response_body, null, 2));
    } else {
      console.log('✅ SUCCESS - Message ID:', log.response_body?.results?.id_message);
    }
  });
}

checkLogs().catch(console.error);
