// Quick test for Admin APIs
// Usage: node scripts/quick-admin-test.js <base_url>
// Example: node scripts/quick-admin-test.js http://localhost:3000

const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:3000';

console.log('Testing:', BASE_URL);
console.log('');

function testEndpoint(path, name) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    
    http.get({
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ ${name}:`, res.statusCode);
          console.log('   Count:', json.count || 0);
          console.log('   Data length:', json.data?.length || 0);
          if (json.data && json.data[0]) {
            console.log('   Sample:', Object.keys(json.data[0]).join(', '));
          }
          resolve(true);
        } catch (e) {
          console.log(`❌ ${name}:`, res.statusCode, '-', data.substring(0, 100));
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`❌ ${name}: ${err.message}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('═════════════════════════════════════════════');
  
  await testEndpoint('/api/admin?action=users&page=1&limit=5', 'Users API');
  console.log('');
  await testEndpoint('/api/admin?action=orders&page=1&limit=5', 'Orders API');
  
  console.log('═════════════════════════════════════════════');
}

main();
