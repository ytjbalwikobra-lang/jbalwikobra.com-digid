const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xeithuvgldzxnggxadri.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXRodXZnbGR6eG5nZ3hhZHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MzMyMSwiZXhwIjoyMDcyMDM5MzIxfQ.pLPA5-pZ4jpjzhsevyMJoRLmLYbPbESfMbt14PBMXd8'
);

async function checkConfig() {
  console.log('Checking woo-wa provider configuration...\n');
  
  const { data: provider, error } = await supabase
    .from('whatsapp_providers')
    .select('*')
    .eq('name', 'woo-wa')
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Provider Config:');
  console.log('- phone_field_name:', provider.phone_field_name);
  console.log('- key_field_name:', provider.key_field_name);
  console.log('- message_field_name:', provider.message_field_name);
  console.log('- send_message_endpoint:', provider.send_message_endpoint);
  console.log('\nExpected values:');
  console.log('- phone_field_name: phone_no');
  console.log('- key_field_name: key');
  console.log('- message_field_name: message');
}

checkConfig().catch(console.error);
