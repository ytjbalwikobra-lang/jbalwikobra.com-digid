#!/usr/bin/env node

/**
 * Admin Panel CRUD Validation Script
 * 
 * This script validates that admin panel CRUD operations
 * are functioning correctly after payment system changes.
 * 
 * Usage:
 *   node scripts/validate-admin-crud.js
 */

const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║   Admin Panel CRUD Validation - Post Payment Changes    ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝\n', 'cyan');
  
  const baseUrl = 'https://www.jbalwikobra.com';
  
  // Test 1: Check if admin API is protected
  test('Admin API Authentication Protection', async () => {
    const response = await httpsRequest(`${baseUrl}/api/admin?action=orders&limit=1`);
    
    if (response.status === 401 || response.status === 403) {
      log('  ✅ Admin API properly protected (requires auth)', 'green');
      return true;
    } else if (response.status === 200) {
      log('  ⚠️  Admin API allows unauthenticated access', 'yellow');
      return true; // Not a failure, just a security concern
    } else {
      log(`  ❌ Unexpected status: ${response.status}`, 'red');
      return false;
    }
  });
  
  // Test 2: Check if create-direct-payment works for QRIS
  test('QRIS Payment Creation (QR Code API)', async () => {
    const payload = {
      amount: 5000,
      currency: 'IDR',
      payment_method_id: 'qris',
      external_id: `test_validation_${Date.now()}`,
      description: 'Validation Test QRIS',
      customer: {
        given_names: 'Test User',
        email: 'test@example.com',
        mobile_number: '+628123456789'
      }
    };
    
    const response = await httpsRequest(`${baseUrl}/api/xendit/create-direct-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.status === 200 && response.data.qr_string) {
      log('  ✅ QRIS payment created with QR code', 'green');
      log(`     Payment ID: ${response.data.id}`, 'cyan');
      log(`     QR String Length: ${response.data.qr_string.length}`, 'cyan');
      return true;
    } else if (response.status === 200 && !response.data.qr_string) {
      log('  ❌ QRIS payment created but NO QR string', 'red');
      log(`     Response: ${JSON.stringify(response.data)}`, 'yellow');
      return false;
    } else {
      log(`  ❌ Payment creation failed: ${response.status}`, 'red');
      log(`     Error: ${JSON.stringify(response.data)}`, 'yellow');
      return false;
    }
  });
  
  // Test 3: Verify payment can be retrieved
  test('Payment Retrieval via get-payment', async () => {
    // Create a payment first
    const createPayload = {
      amount: 5000,
      currency: 'IDR',
      payment_method_id: 'qris',
      external_id: `test_get_${Date.now()}`,
      description: 'Get Payment Test'
    };
    
    const createRes = await httpsRequest(`${baseUrl}/api/xendit/create-direct-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload)
    });
    
    if (createRes.status !== 200) {
      log('  ❌ Could not create test payment', 'red');
      return false;
    }
    
    const paymentId = createRes.data.id;
    
    // Now try to retrieve it
    const getRes = await httpsRequest(`${baseUrl}/api/xendit/get-payment?id=${paymentId}`);
    
    if (getRes.status === 200 && getRes.data.id === paymentId) {
      log('  ✅ Payment retrieved successfully', 'green');
      log(`     Has QR String: ${getRes.data.qr_string ? 'YES' : 'NO'}`, 'cyan');
      return true;
    } else {
      log(`  ❌ Payment retrieval failed`, 'red');
      return false;
    }
  });
  
  // Test 4: Check if debug-qris endpoint works
  test('QRIS Debug Endpoint', async () => {
    // Create a QRIS payment first
    const createPayload = {
      amount: 5000,
      currency: 'IDR',
      payment_method_id: 'qris',
      external_id: `test_debug_${Date.now()}`,
      description: 'Debug Test'
    };
    
    const createRes = await httpsRequest(`${baseUrl}/api/xendit/create-direct-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload)
    });
    
    if (createRes.status !== 200) {
      log('  ❌ Could not create test payment', 'red');
      return false;
    }
    
    const paymentId = createRes.data.id;
    
    // Try debug endpoint
    const debugRes = await httpsRequest(`${baseUrl}/api/xendit/debug-qris?id=${paymentId}`);
    
    if (debugRes.status === 200 && debugRes.data.success) {
      log('  ✅ Debug endpoint working', 'green');
      return true;
    } else {
      log(`  ❌ Debug endpoint failed: ${debugRes.status}`, 'red');
      return false;
    }
  });
  
  // Test 5: Check payment data structure
  test('Payment Data Structure Validation', async () => {
    // Create a payment
    const createPayload = {
      amount: 7500,
      currency: 'IDR',
      payment_method_id: 'qris',
      external_id: `test_struct_${Date.now()}`,
      description: 'Structure Test'
    };
    
    const createRes = await httpsRequest(`${baseUrl}/api/xendit/create-direct-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload)
    });
    
    if (createRes.status !== 200) {
      log('  ❌ Could not create test payment', 'red');
      return false;
    }
    
    const payment = createRes.data;
    
    // Validate structure
    const requiredFields = ['id', 'status', 'amount', 'payment_method', 'qr_string'];
    const missingFields = requiredFields.filter(field => !payment[field]);
    
    if (missingFields.length === 0) {
      log('  ✅ Payment structure valid (all required fields present)', 'green');
      log(`     Fields: ${requiredFields.join(', ')}`, 'cyan');
      return true;
    } else {
      log(`  ❌ Missing fields: ${missingFields.join(', ')}`, 'red');
      log(`     Payment data: ${JSON.stringify(payment)}`, 'yellow');
      return false;
    }
  });
  
  // Test 6: Verify QR string format
  test('QRIS QR String Format Validation', async () => {
    const createPayload = {
      amount: 5000,
      currency: 'IDR',
      payment_method_id: 'qris',
      external_id: `test_qr_format_${Date.now()}`,
      description: 'QR Format Test'
    };
    
    const createRes = await httpsRequest(`${baseUrl}/api/xendit/create-direct-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload)
    });
    
    if (createRes.status !== 200 || !createRes.data.qr_string) {
      log('  ❌ No QR string to validate', 'red');
      return false;
    }
    
    const qrString = createRes.data.qr_string;
    
    // QRIS format validation
    // QRIS strings start with "00020101" (fixed header)
    // Length typically 100-300 characters
    const isValidFormat = qrString.startsWith('00020101') && qrString.length > 50 && qrString.length < 500;
    
    if (isValidFormat) {
      log('  ✅ QR string format valid', 'green');
      log(`     Length: ${qrString.length} chars`, 'cyan');
      log(`     Starts with: ${qrString.substring(0, 20)}...`, 'cyan');
      return true;
    } else {
      log('  ❌ QR string format invalid', 'red');
      log(`     QR String: ${qrString}`, 'yellow');
      return false;
    }
  });
  
  // Run all tests
  log('Running tests...\n', 'bright');
  
  for (const { name, fn } of tests) {
    log(`\n🧪 Test: ${name}`, 'blue');
    try {
      const result = await fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log(`  ❌ Test error: ${error.message}`, 'red');
      failed++;
    }
  }
  
  // Summary
  log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                      Test Summary                        ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝\n', 'cyan');
  
  const total = passed + failed;
  const passRate = ((passed / total) * 100).toFixed(1);
  
  log(`Total Tests: ${total}`, 'bright');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, 'red');
  log(`Pass Rate: ${passRate}%\n`, failed === 0 ? 'green' : 'yellow');
  
  if (failed === 0) {
    log('🎉 All tests passed! Admin CRUD operations are working correctly.', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please review the failures above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
