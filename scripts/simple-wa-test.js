const fetch = require('node-fetch');

async function quickTest() {
  console.log('Testing WhatsApp group send...\n');
  
  try {
    const res = await fetch('https://www.jbalwikobra.com/api/xendit/webhook?testGroupSend=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Test WhatsApp dari script - ' + new Date().toISOString()
      })
    });
    
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ SUCCESS! Check WhatsApp group ORDERAN WEBSITE');
    } else {
      console.log('\n❌ FAILED:', data.error);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

quickTest();
