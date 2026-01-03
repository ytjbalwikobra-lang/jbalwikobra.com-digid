/**
 * Comprehensive Test for Purchase & Rental Payment Flow
 * Tests both order types to ensure WhatsApp notifications work
 */

const https = require('https');

const SUPABASE_URL = 'xeithuvgldzxnggxadri.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXRodXZnbGR6eG5nZ3hhZHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MzMyMSwiZXhwIjoyMDcyMDM5MzIxfQ.pLPA5-pZ4jpjzhsevyMJoRLmLYbPbESfMbt14PBMXd8';
const WEBHOOK_TOKEN = 'idsvSC1p1immz2LDhgTbj2iqYVlvOl3o0mYsMnB9UGGmctsm';

const customerPhone = '085157768097';

console.log('🔄 Testing Complete Purchase & Rental Payment Flow\n');
console.log('═══════════════════════════════════════════════════\n');

async function createOrderAndTriggerWebhook(orderType, productId) {
  return new Promise((resolve) => {
    const timestamp = Date.now();
    const externalId = `test_${orderType}_${timestamp}`;
    const invoiceId = `test_qr_${orderType}_${timestamp}`;
    
    console.log(`\n📦 Creating ${orderType.toUpperCase()} order...`);
    console.log(`   External ID: ${externalId}`);
    console.log(`   Invoice ID: ${invoiceId}`);
    
    const orderData = {
      client_external_id: externalId,
      xendit_invoice_id: invoiceId,
      customer_name: `Test ${orderType} Customer`,
      customer_email: 'test@jbalwikobra.com',
      customer_phone: customerPhone,
      amount: orderType === 'rental' ? 50000 : 25000,
      status: 'pending',
      order_type: orderType,
      payment_method: 'xendit',
      product_id: productId,
      rental_duration: orderType === 'rental' ? 7 : null
    };
    
    const orderPostData = JSON.stringify(orderData);
    
    const orderOptions = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/orders',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    
    const orderReq = https.request(orderOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 201) {
          const order = JSON.parse(data)[0];
          console.log(`   ✅ Order created: ${order.id.substring(0, 13)}...`);
          
          // Trigger webhook after 2 seconds
          setTimeout(() => {
            console.log(`   🎯 Triggering webhook payment COMPLETED...`);
            
            const webhookPayload = {
              id: `qrpy_${orderType}_${timestamp}`,
              event: 'qr.payment',
              amount: orderType === 'rental' ? 50000 : 25000,
              status: 'COMPLETED',
              created: new Date().toISOString(),
              qr_code: {
                id: invoiceId,
                type: 'DYNAMIC',
                external_id: externalId
              },
              payment_details: {
                source: 'TEST_BANK',
                receipt_id: `test_${timestamp}`
              }
            };
            
            const webhookPostData = JSON.stringify(webhookPayload);
            
            const webhookOptions = {
              hostname: 'www.jbalwikobra.com',
              path: '/api/xendit/callback',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-callback-token': WEBHOOK_TOKEN,
                'Content-Length': webhookPostData.length
              }
            };
            
            const webhookReq = https.request(webhookOptions, (webhookRes) => {
              let webhookData = '';
              webhookRes.on('data', (chunk) => { webhookData += chunk; });
              webhookRes.on('end', () => {
                try {
                  const response = JSON.parse(webhookData);
                  
                  if (webhookRes.statusCode === 200 && response.ok) {
                    console.log(`   ✅ Webhook SUCCESS`);
                    console.log(`      - Orders updated: ${response.updated}`);
                    console.log(`      - Payments updated: ${response.payments_updated}`);
                    resolve({ success: true, orderType, response });
                  } else {
                    console.log(`   ⚠️  Webhook processed with issues`);
                    console.log(`      Status: ${webhookRes.statusCode}`);
                    console.log(`      Response: ${JSON.stringify(response)}`);
                    resolve({ success: false, orderType, response });
                  }
                } catch (e) {
                  console.log(`   ❌ Webhook failed`);
                  console.log(`      Raw response: ${webhookData}`);
                  resolve({ success: false, orderType, error: webhookData });
                }
              });
            });
            
            webhookReq.on('error', (error) => {
              console.error(`   ❌ Webhook error: ${error.message}`);
              resolve({ success: false, orderType, error: error.message });
            });
            
            webhookReq.write(webhookPostData);
            webhookReq.end();
            
          }, 2000);
          
        } else {
          console.log(`   ❌ Failed to create order: ${res.statusCode}`);
          console.log(`      ${data}`);
          resolve({ success: false, orderType, error: data });
        }
      });
    });
    
    orderReq.on('error', (error) => {
      console.error(`   ❌ Order creation error: ${error.message}`);
      resolve({ success: false, orderType, error: error.message });
    });
    
    orderReq.write(orderPostData);
    orderReq.end();
  });
}

async function runTests() {
  const productId = 'deb6aa93-d05a-4219-bf22-70463b1f87c2';
  
  console.log('🧪 TEST 1: PURCHASE ORDER');
  console.log('─────────────────────────────────────────────────\n');
  const purchaseResult = await createOrderAndTriggerWebhook('purchase', productId);
  
  // Wait 5 seconds before rental test
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n\n🧪 TEST 2: RENTAL ORDER');
  console.log('─────────────────────────────────────────────────\n');
  const rentalResult = await createOrderAndTriggerWebhook('rental', productId);
  
  // Wait 3 seconds for final summary
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('📊 FINAL RESULTS');
  console.log('═══════════════════════════════════════════════════\n');
  
  console.log('Purchase Order:', purchaseResult.success ? '✅ SUCCESS' : '❌ FAILED');
  console.log('Rental Order:', rentalResult.success ? '✅ SUCCESS' : '❌ FAILED');
  
  console.log('\n📱 Expected WhatsApp Messages:');
  console.log('   1. Customer (085157768097):');
  console.log('      ✓ Payment confirmation for PURCHASE');
  console.log('      ✓ Payment confirmation for RENTAL');
  console.log('');
  console.log('   2. Group (ORDERAN WEBSITE):');
  console.log('      ✓ New PURCHASE order notification');
  console.log('      ✓ New RENTAL order notification');
  console.log('');
  console.log('🔍 Verify:');
  console.log('   - Check WhatsApp 085157768097 (should have 2 messages)');
  console.log('   - Check WhatsApp Group (should have 2 notifications)');
  console.log('   - Check Vercel logs for detailed execution');
  console.log('');
  console.log('If WhatsApp messages received → ✅ System working perfectly!');
  console.log('If no messages → Check Vercel logs for errors');
  console.log('');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
});
