const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xeithuvgldzxnggxadri.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXRodXZnbGR6eG5nZ3hhZHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MzMyMSwiZXhwIjoyMDcyMDM5MzIxfQ.pLPA5-pZ4jpjzhsevyMJoRLmLYbPbESfMbt14PBMXd8'
);

async function checkLogs() {
  console.log('Checking recent WhatsApp message logs...\n');
  
  const { data: logs, error } = await supabase
    .from('whatsapp_message_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  logs.forEach((log, i) => {
    console.log(`\n=== Log ${i + 1} (${log.created_at}) ===`);
    console.log('Success:', log.success);
    console.log('Phone:', log.phone_number);
    console.log('Response Status:', log.response_status);
    console.log('\nRequest Body:');
    console.log(JSON.stringify(log.request_body, null, 2));
    console.log('\nResponse Body:');
    console.log(JSON.stringify(log.response_body, null, 2));
  });
}

checkLogs().catch(console.error);
