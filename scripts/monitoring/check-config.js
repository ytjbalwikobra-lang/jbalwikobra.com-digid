const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xeithuvgldzxnggxadri.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXRodXZnbGR6eG5nZ3hhZHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MzMyMSwiZXhwIjoyMDcyMDM5MzIxfQ.pLPA5-pZ4jpjzhsevyMJoRLmLYbPbESfMbt14PBMXd8'
);

async function checkConfig() {
  console.log('📋 Checking WhatsApp Configuration\n');
  
  // Check provider
  const { data: provider } = await supabase
    .from('whatsapp_providers')
    .select('*')
    .eq('name', 'woo-wa')
    .single();
  
  console.log('Provider:', provider?.name);
  console.log('Base URL:', provider?.base_url);
  console.log('Active:', provider?.is_active);
  console.log('Default Group:', provider?.settings?.default_group_id);
  
  // Check API key
  const { data: apiKey } = await supabase
    .from('whatsapp_api_keys')
    .select('*')
    .eq('provider_id', provider?.id)
    .eq('is_active', true)
    .single();
  
  console.log('\nAPI Key:', apiKey?.api_key?.substring(0, 10) + '...');
  console.log('Active:', apiKey?.is_active);
  console.log('Usage:', apiKey?.usage_count);
  console.log('Last Used:', apiKey?.last_used_at);
  
  console.log('\n✅ Configuration looks good!');
  console.log('\n📱 To test, use Admin Panel:');
  console.log('   1. Go to /admin/whatsapp');
  console.log('   2. Click "Send Test Message"');
  console.log('   3. Check WhatsApp group');
}

checkConfig().catch(console.error);
