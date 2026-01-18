/**
 * Test Webhook Payment Script
 * Simulates a Xendit webhook callback for testing the payment status update
 * 
 * Usage: node scripts/tests/test-webhook-payment.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '../../.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  }
}

loadEnv();

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  console.log('🔍 Finding a pending order to test with...\n');
  
  // Find a pending order (preferably a purchase)
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('id, status, client_external_id, xendit_invoice_id, order_type, amount, customer_name, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (orderError) {
    console.error('❌ Error fetching orders:', orderError);
    return;
  }
  
  if (!orders || orders.length === 0) {
    console.log('⚠️ No pending orders found. Creating a test order...\n');
    
    // Create a test order
    const testExternalId = `test_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const testInvoiceId = `inv_test_${Date.now()}`;
    
    const { data: newOrder, error: createError } = await supabase
      .from('orders')
      .insert({
        client_external_id: testExternalId,
        xendit_invoice_id: testInvoiceId,
        order_type: 'purchase',
        amount: 50000,
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        customer_phone: '081234567890',
        status: 'pending',
        payment_method: 'xendit'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating test order:', createError);
      return;
    }
    
    console.log('✅ Created test order:', newOrder.id);
    orders.push(newOrder);
  }
  
  console.log('📋 Available pending orders:');
  orders.forEach((order, i) => {
    console.log(`  ${i + 1}. ${order.id.substring(0, 8)}... | ${order.order_type} | ${order.customer_name} | Rp ${order.amount?.toLocaleString('id-ID')}`);
    console.log(`      client_external_id: ${order.client_external_id || 'N/A'}`);
    console.log(`      xendit_invoice_id: ${order.xendit_invoice_id || 'N/A'}`);
  });
  
  // Use the first order
  const testOrder = orders[0];
  console.log(`\n🎯 Testing with order: ${testOrder.id}\n`);
  
  // Prepare webhook payload (simulating Xendit webhook)
  const webhookPayload = {
    id: testOrder.xendit_invoice_id || `inv_${Date.now()}`,
    external_id: testOrder.client_external_id,
    status: 'PAID',
    paid_at: new Date().toISOString(),
    payment_method: 'QRIS',
    payment_channel: 'QRIS',
    amount: testOrder.amount,
    currency: 'IDR',
    payer_email: 'test@example.com',
    metadata: {
      client_external_id: testOrder.client_external_id,
      order_type: testOrder.order_type,
      amount: testOrder.amount
    }
  };
  
  console.log('📤 Sending webhook payload:');
  console.log(JSON.stringify(webhookPayload, null, 2));
  console.log('\n');
  
  // Get callback token from env
  const callbackToken = process.env.XENDIT_CALLBACK_TOKEN || '';
  
  // Send to local webhook endpoint
  const postData = JSON.stringify(webhookPayload);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/xendit/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-callback-token': callbackToken
    }
  };
  
  console.log('📡 Calling webhook endpoint: http://localhost:3000/api/xendit/webhook\n');
  
  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', async () => {
      console.log(`📥 Response Status: ${res.statusCode}`);
      console.log('📥 Response Body:');
      try {
        console.log(JSON.stringify(JSON.parse(data), null, 2));
      } catch {
        console.log(data);
      }
      
      // Verify the order was updated
      console.log('\n🔍 Verifying order status in database...\n');
      
      const { data: updatedOrder, error: verifyError } = await supabase
        .from('orders')
        .select('id, status, paid_at, payment_channel, xendit_invoice_id')
        .eq('id', testOrder.id)
        .single();
      
      if (verifyError) {
        console.error('❌ Error verifying order:', verifyError);
      } else {
        console.log('📋 Updated order:');
        console.log(`   ID: ${updatedOrder.id}`);
        console.log(`   Status: ${updatedOrder.status}`);
        console.log(`   Paid At: ${updatedOrder.paid_at || 'N/A'}`);
        console.log(`   Payment Channel: ${updatedOrder.payment_channel || 'N/A'}`);
        console.log(`   Xendit Invoice ID: ${updatedOrder.xendit_invoice_id || 'N/A'}`);
        
        if (updatedOrder.status === 'paid' || updatedOrder.status === 'completed') {
          console.log('\n✅ SUCCESS! Order status updated to:', updatedOrder.status);
        } else {
          console.log('\n⚠️ Order status NOT updated. Current status:', updatedOrder.status);
          console.log('   Check the Vercel dev server logs for errors.');
        }
      }
    });
  });
  
  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
    console.log('\n💡 Make sure the dev server is running: npx vercel dev --listen 3000');
  });
  
  req.write(postData);
  req.end();
}

main().catch(console.error);
