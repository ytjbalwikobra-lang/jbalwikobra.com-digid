// Quick check script for order status
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

const urlMatch = envContent.match(/SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
  console.error('Missing env vars');
  process.exit(1);
}

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(url, key);

sb.from('orders')
  .select('id, status, paid_at, payment_channel, order_type, customer_name')
  .order('created_at', { ascending: false })
  .limit(5)
  .then(r => {
    console.log('Recent orders:');
    r.data.forEach((o, i) => {
      console.log(`${i+1}. ${o.customer_name} | ${o.order_type} | Status: ${o.status} | Paid: ${o.paid_at || 'N/A'}`);
    });
  })
  .catch(e => console.error(e));
