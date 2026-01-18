// Simple webhook test - Run this script in a SEPARATE terminal window
// Usage: node scripts/tests/send-webhook.js

const http = require('http');
const fs = require('fs');
const path = require('path');

// Load callback token from env
const envPath = path.join(__dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const tokenMatch = envContent.match(/XENDIT_CALLBACK_TOKEN=(.+)/);
const callbackToken = tokenMatch ? tokenMatch[1].trim() : '';

// ⚠️ SAFE TEST DATA - Uses fake IDs that won't match any real orders
// This ensures we test the webhook handler logic without affecting real data
const payload = {
  id: 'TEST_INVOICE_' + Date.now(), // Fake invoice ID - won't match real orders
  external_id: 'TEST_ORDER_' + Date.now() + '_safe_test', // Fake order ID - won't match real orders
  status: 'PAID',
  paid_at: new Date().toISOString(),
  payment_method: 'QRIS',
  payment_channel: 'QRIS',
  amount: 100000, // Test amount
  currency: 'IDR',
  payer_email: 'test@example.com'
};

const postData = JSON.stringify(payload);

console.log('🚀 Sending webhook to http://localhost:3000/api/xendit/webhook');
console.log('🔑 Callback token:', callbackToken ? '***' + callbackToken.slice(-4) : 'NOT SET');
console.log('📦 Payload:', JSON.stringify(payload, null, 2));
console.log('');

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

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('📥 Status:', res.statusCode);
    console.log('📥 Response:', data);
    
    if (res.statusCode === 200) {
      console.log('');
      console.log('✅ Webhook processed successfully!');
      console.log('ℹ️  Using SAFE test data - no real orders were modified.');
    } else if (res.statusCode === 200 && data.includes('"updated":0')) {
      console.log('');
      console.log('✅ Webhook handler works correctly!');
      console.log('ℹ️  No orders updated (expected - using fake test IDs)');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error:', e.message);
  console.log('💡 Make sure vercel dev is running on port 3000');
});

req.write(postData);
req.end();
