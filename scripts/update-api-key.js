const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xeithuvgldzxnggxadri.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXRodXZnbGR6eG5nZ3hhZHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MzMyMSwiZXhwIjoyMDcyMDM5MzIxfQ.pLPA5-pZ4jpjzhsevyMJoRLmLYbPbESfMbt14PBMXd8'
);

async function updateKey() {
  console.log('Updating WooWA API key...\n');
  
  // Get woo-wa provider ID
  const { data: provider } = await supabase
    .from('whatsapp_providers')
    .select('id')
    .eq('name', 'woo-wa')
    .single();
  
  if (!provider) {
    console.error('Provider not found!');
    return;
  }
  
  console.log('Provider ID:', provider.id);
  
  // Update the active key
  const { data, error } = await supabase
    .from('whatsapp_api_keys')
    .update({ 
      api_key: 'adpae8c8ac5-a957-4f7f-884b-485a00daaf2f',
      is_active: true,
      is_primary: true
    })
    .eq('provider_id', provider.id)
    .eq('is_active', true)
    .select();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\n✅ API key updated successfully!');
  console.log('Updated records:', data);
}

updateKey().catch(console.error);
