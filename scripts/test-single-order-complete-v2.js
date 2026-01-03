const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabase = createClient(
  'https://xeithuvgldzxnggxadri.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXRodXZnbGR6eG5nZ3hhZHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MzMyMSwiZXhwIjoyMDcyMDM5MzIxfQ.pLPA5-pZ4jpjzhsevyMJoRLmLYbPbESfMbt14PBMXd8'
);

async function testCompleteFlow() {
  console.log('�� Testing COMPLETE Order + Webhook + Notification Flow\n');
  
  const externalId = 'test_complete_' + Date.now();
  const invoiceId = 'qr_' + externalId;
  
  // Step 1: Create order in database
  console.log('1️⃣  Creating order in database...');
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      client_external_id: externalId,
      xendit_invoice_id: invoiceId,
      order_type: 'purchase',
      amount: 25000,
      customer_name: 'Test Customer',
      customer_email: 'test@test.com',
      customer_phone: '085157768097',
      status: 'pending',
      payment_method: 'xendit',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (orderError) {
    console.error('❌ Failed to create order:', orderError);
    return;
  }
  
  console.log('✅ Order created:', order.id);
  console.log('   External ID:', externalId);
  console.log('   Invoice ID:', invoiceId);
  
  // Step 2: Wait 2 seconds
  console.log('\n2️⃣  Waiting 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 3: Trigger webhook
  console.log('\n3️⃣  Triggering Xendit webhook...');
  const webhookPayload = {
    id: invoiceId,
    external_id: externalId,
    user_id: 'test',
    status: 'COMPLETED',
    amount: 25000,
    payer_email: 'test@test.com',
    description: 'Test payment',
    qr_code: {
      external_id: externalId,
      status: 'COMPLETED'
    }
  };
  
  const response = await fetch('https://www.jbalwikobra.com/api/xendit/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-callback-token': 'idsvSC1p1immz2LDhgTbj2iqYVlvOl3o0mYsMnB9UGGmctsm'
    },
    body: JSON.stringify(webhookPayload)
  });
  
  const result = await response.json();
  console.log('✅ Webhook response:', result);
  
  // Step 4: Wait for logs
  console.log('\n4️⃣  Waiting 3 seconds for WhatsApp logs...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 5: Check logs
  console.log('\n5️⃣  Checking WhatsApp logs...');
  const { data: logs } = await supabase
    .from('whatsapp_message_logs')
    .select('*')
    .or(`context_id.eq.order:${order.id}:success`)
    .order('created_at', { ascending: false });
  
  console.log('\n📊 RESULTS:');
  console.log('   Webhook updated:', result.updated, 'orders');
  console.log('   WhatsApp logs found:', logs?.length || 0);
  
  if (logs && logs.length > 0) {
    console.log('\n✅ SUCCESS - WhatsApp notifications sent!');
    logs.forEach((log, i) => {
      console.log(`\n   Log ${i + 1}:`);
      console.log('   - Phone:', log.phone_number);
      console.log('   - Success:', log.success);
      console.log('   - Context:', log.context_type);
    });
    
    console.log('\n🎯 Check WhatsApp:');
    console.log('   - Customer: 085157768097');
    console.log('   - Group: ORDERAN WEBSITE');
  } else {
    console.log('\n❌ FAILED - No WhatsApp logs found!');
    console.log('   This means sendOrderPaidNotification was not called or failed silently.');
    console.log('\n   Check Vercel logs for [WhatsApp] messages.');
  }
}

testCompleteFlow().catch(console.error);
