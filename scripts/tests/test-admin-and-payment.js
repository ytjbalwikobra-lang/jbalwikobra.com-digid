// Test script for Admin APIs and Payment Flow
// Run with: node scripts/test-admin-and-payment.js

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@jbalwikobra.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

console.log('🧪 Testing Admin APIs and Payment Flow');
console.log('Base URL:', BASE_URL);
console.log('');

// Helper function to make requests
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test 1: Admin Users API
async function testAdminUsers() {
  console.log('📊 Test 1: Admin Users API');
  try {
    const response = await makeRequest('/api/admin?action=users&page=1&limit=10', {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });
    
    console.log('  Status:', response.status);
    console.log('  Users count:', response.data.count);
    console.log('  Users returned:', response.data.data?.length || 0);
    if (response.data.data && response.data.data.length > 0) {
      const user = response.data.data[0];
      console.log('  Sample user:', {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin,
        is_active: user.is_active
      });
      console.log('  ✅ Users API working');
      return true;
    } else {
      console.log('  ⚠️  No users returned');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

// Test 2: Admin Orders API
async function testAdminOrders() {
  console.log('\n📦 Test 2: Admin Orders API');
  try {
    const response = await makeRequest('/api/admin?action=orders&page=1&limit=10', {
      headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
    });
    
    console.log('  Status:', response.status);
    console.log('  Orders count:', response.data.count);
    console.log('  Orders returned:', response.data.data?.length || 0);
    if (response.data.data && response.data.data.length > 0) {
      const order = response.data.data[0];
      console.log('  Sample order:', {
        id: order.id,
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        status: order.status,
        payment_status: order.payment_status
      });
      console.log('  ✅ Orders API working');
      return true;
    } else {
      console.log('  ⚠️  No orders returned');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

// Test 3: Payment Creation - QRIS
async function testPaymentQRIS() {
  console.log('\n💳 Test 3: Payment Creation - QRIS');
  try {
    const response = await makeRequest('/api/xendit/create-direct-payment', {
      method: 'POST',
      body: {
        amount: 50000,
        currency: 'IDR',
        payment_method_id: 'qris',
        external_id: `test-qris-${Date.now()}`,
        description: 'Test QRIS Payment',
        customer: {
          given_names: 'Test User',
          email: 'test@example.com',
          mobile_number: '+628123456789'
        }
      }
    });
    
    console.log('  Status:', response.status);
    if (response.status === 200 || response.status === 201) {
      console.log('  Payment ID:', response.data.id);
      console.log('  Payment URL:', response.data.actions?.desktop_web_checkout_url || 'N/A');
      console.log('  ✅ QRIS payment creation working');
      return true;
    } else {
      console.log('  Response:', JSON.stringify(response.data, null, 2));
      console.log('  ❌ QRIS payment creation failed');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

// Test 4: Payment Creation - Virtual Account (BNI)
async function testPaymentVA() {
  console.log('\n🏦 Test 4: Payment Creation - Virtual Account (BNI)');
  try {
    const response = await makeRequest('/api/xendit/create-direct-payment', {
      method: 'POST',
      body: {
        amount: 75000,
        currency: 'IDR',
        payment_method_id: 'bni',
        external_id: `test-va-bni-${Date.now()}`,
        description: 'Test BNI VA Payment',
        customer: {
          given_names: 'Test User',
          email: 'test@example.com',
          mobile_number: '+628123456789'
        }
      }
    });
    
    console.log('  Status:', response.status);
    if (response.status === 200 || response.status === 201) {
      console.log('  Payment ID:', response.data.id);
      console.log('  Payment URL:', response.data.actions?.desktop_web_checkout_url || 'N/A');
      console.log('  ✅ BNI VA payment creation working');
      return true;
    } else {
      console.log('  Response:', JSON.stringify(response.data, null, 2));
      console.log('  ❌ BNI VA payment creation failed');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

// Test 5: Payment Creation - E-wallet (ShopeePay)
async function testPaymentEwallet() {
  console.log('\n💰 Test 5: Payment Creation - E-wallet (ShopeePay)');
  try {
    const response = await makeRequest('/api/xendit/create-direct-payment', {
      method: 'POST',
      body: {
        amount: 100000,
        currency: 'IDR',
        payment_method_id: 'shopeepay',
        external_id: `test-shopeepay-${Date.now()}`,
        description: 'Test ShopeePay Payment',
        customer: {
          given_names: 'Test User',
          email: 'test@example.com',
          mobile_number: '+628123456789'
        }
      }
    });
    
    console.log('  Status:', response.status);
    if (response.status === 200 || response.status === 201) {
      console.log('  Payment ID:', response.data.id);
      console.log('  Payment URL:', response.data.actions?.mobile_deeplink_checkout_url || 'N/A');
      console.log('  ✅ ShopeePay payment creation working');
      return true;
    } else {
      console.log('  Response:', JSON.stringify(response.data, null, 2));
      console.log('  ❌ ShopeePay payment creation failed');
      return false;
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  
  const results = {
    adminUsers: await testAdminUsers(),
    adminOrders: await testAdminOrders(),
    paymentQRIS: await testPaymentQRIS(),
    paymentVA: await testPaymentVA(),
    paymentEwallet: await testPaymentEwallet()
  };
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📋 Test Summary:');
  console.log('  Admin Users:', results.adminUsers ? '✅ PASS' : '❌ FAIL');
  console.log('  Admin Orders:', results.adminOrders ? '✅ PASS' : '❌ FAIL');
  console.log('  Payment QRIS:', results.paymentQRIS ? '✅ PASS' : '❌ FAIL');
  console.log('  Payment VA:', results.paymentVA ? '✅ PASS' : '❌ FAIL');
  console.log('  Payment E-wallet:', results.paymentEwallet ? '✅ PASS' : '❌ FAIL');
  
  const passCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.keys(results).length;
  
  console.log('\n  Overall:', `${passCount}/${totalCount} tests passed`);
  console.log('═══════════════════════════════════════════════════════');
  
  process.exit(passCount === totalCount ? 0 : 1);
}

// Start tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
