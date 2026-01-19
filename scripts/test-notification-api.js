// Test notification API endpoint
require('dotenv').config({ path: '.env.local' });

async function testAPI() {
  console.log('\n🧪 TESTING NOTIFICATION API\n');
  
  const baseUrl = 'http://localhost:3001';
  
  try {
    // Test 1: Fetch notifications via API
    console.log('1️⃣ Testing GET /api/admin-notifications...');
    const response = await fetch(`${baseUrl}/api/admin-notifications?action=recent&limit=50`);
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', {
        dataType: typeof data,
        hasData: !!data?.data,
        dataLength: data?.data?.length || 0,
        error: data?.error
      });
      
      if (data?.data && data.data.length > 0) {
        console.log('\nFirst 3 notifications:');
        data.data.slice(0, 3).forEach((n, i) => {
          console.log(`  ${i + 1}. ${n.type} | ${n.title} | ${n.customer_name}`);
        });
      } else {
        console.log('⚠️ No notifications returned');
      }
    } else {
      const errorData = await response.text();
      console.error('❌ API Error:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAPI();
