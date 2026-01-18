#!/usr/bin/env node

// Test the /api/admin-whatsapp-groups endpoint directly
require('dotenv').config({ path: '.env.local' });

const testEndpoint = async () => {
  console.log('🧪 TESTING /api/admin-whatsapp-groups ENDPOINT\n');
  console.log('='.repeat(60));
  
  // Test 1: Check if endpoint is accessible (without auth)
  console.log('\n📡 Test 1: Checking endpoint accessibility...\n');
  
  const testUrls = [
    'http://localhost:3000/api/admin-whatsapp-groups',
    'https://jbalwikobra-com-digid.vercel.app/api/admin-whatsapp-groups'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await fetch(url);
      const data = await response.json().catch(() => ({}));
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
      
      if (response.status === 401) {
        console.log('✅ Endpoint exists and requires authentication (expected)');
      } else if (response.status === 404) {
        console.log('❌ Endpoint returns 404 - API not deployed or routing issue');
      } else if (response.status === 200) {
        console.log('✅ Endpoint accessible and returned data');
      }
      
      console.log('');
    } catch (error) {
      console.log(`❌ Cannot reach: ${error.message}\n`);
    }
  }
  
  // Test 2: Check with authentication
  console.log('='.repeat(60));
  console.log('\n📡 Test 2: Testing with admin authentication...\n');
  
  // Get token from localStorage simulation (you'll need to provide this)
  const sessionToken = process.env.SESSION_TOKEN;
  
  if (!sessionToken) {
    console.log('⚠️  No SESSION_TOKEN provided in environment');
    console.log('To test with authentication:');
    console.log('1. Log in to admin panel');
    console.log('2. Get session_token from browser localStorage');
    console.log('3. Run: SESSION_TOKEN="your-token" node scripts/test-api-endpoint.js');
    return;
  }
  
  console.log('Session token provided, testing authenticated request...\n');
  
  try {
    const response = await fetch(
      'https://jbalwikobra-com-digid.vercel.app/api/admin-whatsapp-groups',
      {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      }
    );
    
    const data = await response.json().catch(() => ({}));
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    
    if (response.status === 200) {
      console.log(`\n✅ SUCCESS! Found ${data.groups?.length || 0} groups`);
      if (data.groups && data.groups.length > 0) {
        console.log('\nGroups:');
        data.groups.forEach((g, i) => {
          console.log(`  ${i + 1}. ${g.name} (${g.id})`);
        });
      }
    } else if (response.status === 404) {
      console.log('\n❌ 404 Error - This is the issue!');
      console.log('Error details:', data);
    } else if (response.status === 401) {
      console.log('\n❌ Authentication failed - Token invalid or expired');
    }
  } catch (error) {
    console.log(`\n❌ Request failed: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
};

testEndpoint().catch(console.error);
