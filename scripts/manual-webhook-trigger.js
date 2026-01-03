const fetch = require('node-fetch');

async function triggerWebhook() {
  console.log('Triggering webhook manually with full logging...\n');
  
  const webhookPayload = {
    id: 'test_manual_' + Date.now(),
    external_id: 'test_manual_' + Date.now(),
    user_id: 'test_user',
    status: 'COMPLETED',
    amount: 50000,
    payer_email: 'test@example.com',
    description: 'Manual test webhook',
    qr_code: {
      external_id: 'test_manual_' + Date.now(),
      status: 'COMPLETED'
    }
  };
  
  console.log('Payload:', JSON.stringify(webhookPayload, null, 2));
  console.log('\nCalling webhook...\n');
  
  const response = await fetch('https://www.jbalwikobra.com/api/xendit/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-callback-token': 'idsvSC1p1immz2LDhgTbj2iqYVlvOl3o0mYsMnB9UGGmctsm'
    },
    body: JSON.stringify(webhookPayload)
  });
  
  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));
  
  console.log('\n⏱️  Waiting 5 seconds for logs to be written...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n📊 Check Vercel logs at: https://vercel.com/ytjbalwikobra-langs-projects/jbalwikobra-com-digid');
  console.log('Filter for: [WhatsApp]');
}

triggerWebhook().catch(console.error);
