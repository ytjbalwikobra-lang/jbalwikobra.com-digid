/**
 * Test WhatsApp Notification Script
 * 
 * Creates a test order and triggers webhook to test WhatsApp notifications:
 * 1. Creates order in database
 * 2. Simulates Xendit webhook payment COMPLETED
 * 3. Should trigger WhatsApp to customer and group
 * 
 * Usage: node scripts/test-whatsapp-notification.js [phone_number]
 */

const https = require('https');

const SUPABASE_URL = 'xeithuvgldzxnggxadri.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXRodXZnbGR6eG5nZ3hhZHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MzMyMSwiZXhwIjoyMDcyMDM5MzIxfQ.pLPA5-pZ4jpjzhsevyMJoRLmLYbPbESfMbt14PBMXd8';
const WEBHOOK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN || 'idsvSC1p1immz2LDhgTbj2iqYVlvOl3o0mYsMnB9UGGmctsm';

const customerPhone = process.argv[2] || '085157768097';
const timestamp = Date.now();
const externalId = `test_order_${timestamp}`;
const invoiceId = `test_qr_${timestamp}`;

console.log('🔄 Testing WhatsApp Notification System\n');
console.log('Customer Phone:', customerPhone);
console.log('External ID:', externalId);
console.log('Invoice ID:', invoiceId);
console.log('');

// Step 1: Create test order
console.log('📝 Step 1: Creating test order in database...');

const orderData = {
  client_external_id: externalId,
  xendit_invoice_id: invoiceId,
  customer_name: 'Test WhatsApp Customer',
  customer_email: 'test@jbalwikobra.com',
  customer_phone: customerPhone,
  amount: 15000,
  status: 'pending',
  order_type: 'purchase',
  payment_method: 'xendit',
  product_id: 'deb6aa93-d05a-4219-bf22-70463b1f87c2' // Default product ID
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
      console.log('✅ Order created successfully!');
      console.log('   Order ID:', order.id);
      console.log('');
      
      // Step 2: Trigger webhook
      console.log('📝 Step 2: Triggering Xendit webhook (payment COMPLETED)...\n');
      
      setTimeout(() => {
        const webhookPayload = {
          id: `qrpy_test_${timestamp}`,
          event: 'qr.payment',
          amount: 15000,
          status: 'COMPLETED',
          created: new Date().toISOString(),
          qr_code: {
            id: invoiceId,
            type: 'DYNAMIC',
            external_id: externalId
          },
          payment_details: {
            source: 'TEST_BANK',
            receipt_id: `test_receipt_${timestamp}`
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
            console.log('📞 Webhook Status:', webhookRes.statusCode);
            
            try {
              const response = JSON.parse(webhookData);
              console.log('📞 Webhook Response:', JSON.stringify(response, null, 2));
              console.log('');
              
              if (webhookRes.statusCode === 200 && response.ok) {
                console.log('✅ TEST COMPLETED SUCCESSFULLY!\n');
                console.log('📊 Results:');
                console.log('   - Orders updated:', response.updated);
                console.log('   - Payments updated:', response.payments_updated);
                console.log('   - Sync status:', response.sync_status);
                console.log('');
                console.log('📱 Expected WhatsApp Notifications:');
                console.log(`   1. Customer notification → ${customerPhone}`);
                console.log('   2. Group notification → ORDERAN WEBSITE ✅');
                console.log('');
                console.log('🔍 Troubleshooting:');
                console.log('   - If no WhatsApp received, check Vercel logs');
                console.log('   - Verify WhatsApp provider configuration');
                console.log('   - Check group ID matches configured group');
                console.log('   - Ensure NotifAPI has credits/active');
              } else {
                console.log('⚠️  Webhook processed with issues - check response above');
              }
            } catch (e) {
              console.log('📞 Raw Response:', webhookData);
            }
          });
        });
        
        webhookReq.on('error', (error) => {
          console.error('❌ Webhook error:', error.message);
        });
        
        webhookReq.write(webhookPostData);
        webhookReq.end();
        
      }, 2000); // Wait 2 seconds before triggering webhook
      
    } else {
      console.log('❌ Failed to create order');
      console.log('Status:', res.statusCode);
      console.log('Response:', data);
    }
  });
});

orderReq.on('error', (error) => {
  console.error('❌ Order creation error:', error.message);
});

orderReq.write(orderPostData);
orderReq.end();
