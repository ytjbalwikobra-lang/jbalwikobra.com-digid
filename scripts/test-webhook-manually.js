const https = require('https');

// Simulate the exact payload from Xendit that failed
const webhookPayload = {
  "id": "qrpy_32dc440f-aee1-40d4-af32-6d2249c493ae",
  "event": "qr.payment",
  "amount": 10000,
  "status": "COMPLETED",
  "created": "2026-01-03T05:41:02.419127Z",
  "qr_code": {
    "id": "qr_e6710fe1-41fe-4939-b2d1-875973aae339",
    "type": "DYNAMIC",
    "metadata": null,
    "qr_string": "00020101021226650013CO.XENDIT.WWW01189360084800000054690215MTp47ZSspWsSQxG0303UME51370014ID.CO.QRIS.WWW0215ID20254267526685204509953033605405100005802ID5923PT ALWI KOBRA INDONESIA6006Bekasi61051715162290525xoizLQizgQUsgqK4tR4kMBcLc630475A5",
    "external_id": "order_1767418834448_bkzxgfha0_ru.ll_7mcq"
  },
  "payment_details": {
    "source": "BNI",
    "receipt_id": "290b03ee7629"
  }
};

console.log('🔄 Testing Webhook Handler with QR Payment Payload\n');
console.log('Payload:', JSON.stringify(webhookPayload, null, 2));
console.log('');

const postData = JSON.stringify(webhookPayload);

const options = {
  hostname: 'jbalwikobra-com-digid-digitalindo.vercel.app',
  path: '/api/xendit/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length,
    // Add callback token if you have it
    // 'x-callback-token': 'YOUR_XENDIT_CALLBACK_TOKEN'
  }
};

console.log('📞 Sending webhook to:', `${options.hostname}${options.path}`);
console.log('');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', data);
    console.log('');
    
    if (res.statusCode === 200) {
      console.log('✅ Webhook processed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Check order status in database');
      console.log('2. Check WhatsApp notifications sent');
      console.log('3. Verify admin notifications created');
    } else {
      console.log('❌ Webhook failed with status:', res.statusCode);
      console.log('');
      console.log('Possible causes:');
      console.log('- Callback token mismatch');
      console.log('- Order not found with external_id:', webhookPayload.qr_code.external_id);
      console.log('- Server error');
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request Error:', err.message);
});

req.write(postData);
req.end();
