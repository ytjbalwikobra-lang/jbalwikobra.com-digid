const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabase = createClient(
  'https://xeithuvgldzxnggxadri.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXRodXZnbGR6eG5nZ3hhZHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MzMyMSwiZXhwIjoyMDcyMDM5MzIxfQ.pLPA5-pZ4jpjzhsevyMJoRLmLYbPbESfMbt14PBMXd8'
);

async function testWhatsApp() {
  console.log('🧪 Testing WhatsApp Notification Flow\n');
  
  const timestamp = Date.now();
  const externalId = `test_wa_${timestamp}`;
  const invoiceId = `qr_${externalId}`;
  
  try {
    // 1. Create test order
    console.log('1️⃣  Creating test order...');
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        client_external_id: externalId,
        xendit_invoice_id: invoiceId,
        order_type: 'purchase',
        amount: 50000,
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        customer_phone: '085157768097',
        status: 'pending',
        payment_method: 'xendit',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orderErr) throw new Error('Order creation failed: ' + orderErr.message);
    console.log('   ✅ Order created:', order.id);
    console.log('   📱 Phone:', order.customer_phone);
    
    // 2. Wait 2 seconds
    console.log('\n2️⃣  Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Trigger webhook
    console.log('\n3️⃣  Triggering Xendit webhook...');
    const webhookPayload = {
      id: invoiceId,
      external_id: externalId,
      user_id: 'test',
      status: 'COMPLETED',
      amount: 50000,
      payer_email: 'test@example.com',
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
    console.log('   ✅ Webhook response:', JSON.stringify(result, null, 2));
    
    if (!result.ok) {
      throw new Error('Webhook failed: ' + JSON.stringify(result));
    }
    
    // 4. Wait for WhatsApp processing
    console.log('\n4️⃣  Waiting 5 seconds for WhatsApp processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 5. Check WhatsApp logs
    console.log('\n5️⃣  Checking WhatsApp message logs...');
    const { data: logs, error: logsErr } = await supabase
      .from('whatsapp_message_logs')
      .select('*')
      .eq('context_id', `order:${order.id}:success`)
      .order('created_at', { ascending: false });
    
    if (logsErr) {
      console.warn('   ⚠️  Could not fetch logs:', logsErr.message);
    }
    
    console.log('\n📊 RESULTS:');
    console.log('═══════════════════════════════════════');
    console.log('✅ Order ID:', order.id);
    console.log('✅ Webhook Status:', result.updated ? 'SUCCESS' : 'FAILED');
    console.log('✅ Orders Updated:', result.updated || 0);
    console.log('✅ WhatsApp Logs:', logs?.length || 0, 'messages');
    
    if (logs && logs.length > 0) {
      console.log('\n📱 WhatsApp Messages Sent:');
      logs.forEach((log, i) => {
        console.log(`\n   Message ${i + 1}:`);
        console.log('   - Phone:', log.phone_number);
        console.log('   - Type:', log.context_type);
        console.log('   - Success:', log.success);
        console.log('   - Status:', log.response_status);
        if (!log.success) {
          console.log('   - Error:', JSON.stringify(log.response_body, null, 2));
        }
      });
      
      const allSuccess = logs.every(log => log.success);
      if (allSuccess) {
        console.log('\n🎉 SUCCESS! All WhatsApp notifications sent successfully!');
        console.log('\n📲 Check your WhatsApp:');
        console.log('   - Customer phone: 085157768097');
        console.log('   - Admin group: ORDERAN WEBSITE');
      } else {
        console.log('\n❌ FAILED! Some notifications did not send.');
      }
    } else {
      console.log('\n⚠️  WARNING: No WhatsApp logs found!');
      console.log('   This means notifications were not sent.');
      console.log('   Check Vercel logs for errors.');
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Details:', error);
  }
}

testWhatsApp();
