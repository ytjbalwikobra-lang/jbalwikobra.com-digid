const fetch = require('node-fetch');

async function testWooWA() {
  console.log('Testing WooWA API directly...\n');
  
  // Test 1: Send individual message
  console.log('1️⃣  Testing individual message...');
  const response1 = await fetch('https://notifapi.com/send_message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: 'adpae8c8ac5-a957-4f7f-884b-485a00daaf2f',
      phone_no: '085157768097',
      message: 'Test dari script - ' + new Date().toISOString()
    })
  });
  
  const data1 = await response1.json();
  console.log('Response:', JSON.stringify(data1, null, 2));
  console.log('');
  
  // Test 2: Send group message
  console.log('2️⃣  Testing group message...');
  const response2 = await fetch('https://notifapi.com/send_message_group_id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: 'adpae8c8ac5-a957-4f7f-884b-485a00daaf2f',
      group_id: '120363405729592501@g.us',
      message: 'Test group dari script - ' + new Date().toISOString()
    })
  });
  
  const data2 = await response2.json();
  console.log('Response:', JSON.stringify(data2, null, 2));
}

testWooWA().catch(console.error);
