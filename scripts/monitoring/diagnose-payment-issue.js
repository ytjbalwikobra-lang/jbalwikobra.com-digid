const https = require('https');

const SUPABASE_URL = 'xeithuvgldzxnggxadri.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXRodXZnbGR6eG5nZ3hhZHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MzMyMSwiZXhwIjoyMDcyMDM5MzIxfQ.pLPA5-pZ4jpjzhsevyMJoRLmLYbPbESfMbt14PBMXd8';

console.log('🔍 PAYMENT ISSUE DIAGNOSTIC REPORT');
console.log('='.repeat(70));
console.log('');

async function checkRecentOrders() {
  return new Promise((resolve, reject) => {
    console.log('1️⃣  Checking recent orders...\n');
    
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/orders?select=*&order=created_at.desc&limit=5',
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const orders = JSON.parse(data);
          console.log(`Found ${orders.length} recent orders:\n`);
          
          orders.forEach((order, idx) => {
            console.log(`Order ${idx + 1}:`);
            console.log(`  ID: ${order.id}`);
            console.log(`  Status: ${order.status}`);
            console.log(`  Customer: ${order.customer_name}`);
            console.log(`  Amount: Rp ${Number(order.amount).toLocaleString('id-ID')}`);
            console.log(`  Created: ${order.created_at}`);
            console.log(`  Paid At: ${order.paid_at || 'Not paid yet'}`);
            console.log(`  Payment Channel: ${order.payment_channel || 'N/A'}`);
            console.log(`  Xendit Invoice ID: ${order.xendit_invoice_id || 'N/A'}`);
            console.log('');
          });
          
          resolve(orders);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

async function checkWhatsAppLogs() {
  return new Promise((resolve, reject) => {
    console.log('2️⃣  Checking WhatsApp message logs...\n');
    
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/whatsapp_message_logs?select=*&order=created_at.desc&limit=10',
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const logs = JSON.parse(data);
          console.log(`Found ${logs.length} recent WhatsApp messages:\n`);
          
          logs.forEach((log, idx) => {
            console.log(`Message ${idx + 1}:`);
            console.log(`  Context Type: ${log.context_type}`);
            console.log(`  Context ID: ${log.context_id}`);
            console.log(`  Status: ${log.status}`);
            console.log(`  Created: ${log.created_at}`);
            console.log(`  Response: ${log.response_status || 'N/A'}`);
            console.log('');
          });
          
          resolve(logs);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

async function checkAdminNotifications() {
  return new Promise((resolve, reject) => {
    console.log('3️⃣  Checking admin notifications...\n');
    
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/admin_notifications?select=*&order=created_at.desc&limit=10',
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const notifications = JSON.parse(data);
          console.log(`Found ${notifications.length} recent admin notifications:\n`);
          
          notifications.forEach((notif, idx) => {
            console.log(`Notification ${idx + 1}:`);
            console.log(`  Type: ${notif.type}`);
            console.log(`  Title: ${notif.title}`);
            console.log(`  Message: ${notif.message.substring(0, 100)}...`);
            console.log(`  Created: ${notif.created_at}`);
            console.log('');
          });
          
          resolve(notifications);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

async function checkGroupConfig() {
  return new Promise((resolve, reject) => {
    console.log('4️⃣  Checking WhatsApp group configuration...\n');
    
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/whatsapp_providers?is_active=eq.true&select=*',
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const providers = JSON.parse(data);
          
          if (providers.length > 0) {
            const provider = providers[0];
            console.log('Active Provider:', provider.name);
            console.log('Default Group ID:', provider.settings?.default_group_id);
            console.log('Group Configurations:');
            console.log('  Rental Orders:', provider.settings?.group_configurations?.rental_orders);
            console.log('  Purchase Orders:', provider.settings?.group_configurations?.purchase_orders);
            console.log('  Flash Sales:', provider.settings?.group_configurations?.flash_sales);
            console.log('');
          } else {
            console.log('❌ No active provider found!');
          }
          
          resolve(providers);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

async function runDiagnostics() {
  try {
    const orders = await checkRecentOrders();
    const logs = await checkWhatsAppLogs();
    const notifications = await checkAdminNotifications();
    const config = await checkGroupConfig();
    
    console.log('='.repeat(70));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(70));
    
    const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'completed');
    console.log(`✅ Paid Orders: ${paidOrders.length}/${orders.length}`);
    console.log(`📱 WhatsApp Messages Sent: ${logs.length}`);
    console.log(`🔔 Admin Notifications: ${notifications.length}`);
    console.log(`⚙️  Active Provider: ${config.length > 0 ? config[0].name : 'NONE'}`);
    console.log('');
    
    if (paidOrders.length > 0 && logs.length === 0) {
      console.log('⚠️  WARNING: Paid orders found but NO WhatsApp messages sent!');
      console.log('   Possible causes:');
      console.log('   - Webhook not triggering');
      console.log('   - WhatsApp API error');
      console.log('   - Group ID configuration issue');
    }
    
    if (paidOrders.length > 0 && logs.length > 0) {
      console.log('✅ System appears to be working - payments and notifications present');
    }
    
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
}

runDiagnostics();
