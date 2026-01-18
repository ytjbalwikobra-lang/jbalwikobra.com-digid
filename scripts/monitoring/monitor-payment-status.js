#!/usr/bin/env node

/**
 * Payment Status Monitor
 * 
 * This script checks for discrepancies between orders and payments tables
 * to help identify when payments are processed but order status isn't updated
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkPaymentStatusSync() {
  console.log('🔍 Payment Status Synchronization Monitor');
  console.log('=========================================');
  console.log('');

  try {
    // Find orders that are still pending but have paid payments
    console.log('1️⃣ Checking for orders with pending status but paid payments...');
    
    const { data: pendingOrdersWithPaidPayments, error: pendingError } = await supabase
      .from('orders')
      .select(`
        id,
        client_external_id,
        xendit_invoice_id,
        status,
        amount,
        customer_name,
        created_at,
        paid_at,
        payments!inner(
          id,
          status,
          paid_at,
          external_id,
          xendit_id
        )
      `)
      .eq('status', 'pending')
      .in('payments.status', ['PAID', 'COMPLETED', 'SUCCEEDED'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (pendingError) {
      console.error('❌ Error checking pending orders:', pendingError);
    } else if (pendingOrdersWithPaidPayments && pendingOrdersWithPaidPayments.length > 0) {
      console.log(`⚠️ Found ${pendingOrdersWithPaidPayments.length} orders with pending status but paid payments:`);
      console.log('');
      
      pendingOrdersWithPaidPayments.forEach((order, index) => {
        console.log(`${index + 1}. Order ID: ${order.id}`);
        console.log(`   Customer: ${order.customer_name || 'Unknown'}`);
        console.log(`   Amount: Rp ${Number(order.amount || 0).toLocaleString('id-ID')}`);
        console.log(`   Order Status: ${order.status}`);
        console.log(`   Payment Status: ${order.payments?.[0]?.status || 'Unknown'}`);
        console.log(`   External ID: ${order.client_external_id}`);
        console.log(`   Invoice ID: ${order.xendit_invoice_id || 'None'}`);
        console.log(`   Created: ${new Date(order.created_at).toLocaleString('id-ID')}`);
        console.log(`   Order Paid At: ${order.paid_at ? new Date(order.paid_at).toLocaleString('id-ID') : 'Not set'}`);
        console.log(`   Payment Paid At: ${order.payments?.[0]?.paid_at ? new Date(order.payments[0].paid_at).toLocaleString('id-ID') : 'Not set'}`);
        console.log('   ---');
      });
      
      console.log('🔧 These orders may need manual status correction!');
    } else {
      console.log('✅ No pending orders with paid payments found');
    }
    
    console.log('');
    
    // Find payments that are paid but have no corresponding orders
    console.log('2️⃣ Checking for paid payments without corresponding orders...');
    
    const { data: orphanedPayments, error: orphanError } = await supabase
      .from('payments')
      .select(`
        id,
        external_id,
        xendit_id,
        status,
        amount,
        created_at,
        paid_at
      `)
      .in('status', ['PAID', 'COMPLETED', 'SUCCEEDED'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (orphanError) {
      console.error('❌ Error checking payments:', orphanError);
    } else if (orphanedPayments && orphanedPayments.length > 0) {
      let orphanedCount = 0;
      
      for (const payment of orphanedPayments) {
        // Check if there's a corresponding order
        let orderQuery = supabase.from('orders').select('id, status');
        
        if (payment.xendit_id) {
          orderQuery = orderQuery.eq('xendit_invoice_id', payment.xendit_id);
        } else if (payment.external_id) {
          orderQuery = orderQuery.eq('client_external_id', payment.external_id);
        } else {
          continue; // Skip if no identifiers
        }
        
        const { data: correspondingOrders } = await orderQuery.limit(1);
        
        if (!correspondingOrders || correspondingOrders.length === 0) {
          if (orphanedCount === 0) {
            console.log('⚠️ Found paid payments without corresponding orders:');
            console.log('');
          }
          
          orphanedCount++;
          console.log(`${orphanedCount}. Payment ID: ${payment.id}`);
          console.log(`   Status: ${payment.status}`);
          console.log(`   Amount: Rp ${Number(payment.amount || 0).toLocaleString('id-ID')}`);
          console.log(`   External ID: ${payment.external_id || 'None'}`);
          console.log(`   Xendit ID: ${payment.xendit_id || 'None'}`);
          console.log(`   Created: ${new Date(payment.created_at).toLocaleString('id-ID')}`);
          console.log(`   Paid At: ${payment.paid_at ? new Date(payment.paid_at).toLocaleString('id-ID') : 'Not set'}`);
          console.log('   ---');
        }
      }
      
      if (orphanedCount === 0) {
        console.log('✅ No orphaned payments found');
      } else {
        console.log(`🔧 Found ${orphanedCount} orphaned payments that may need investigation!`);
      }
    }
    
    console.log('');
    
    // Summary statistics
    console.log('3️⃣ Payment Status Summary (Last 24 hours)...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const [ordersStats, paymentsStats] = await Promise.all([
      supabase
        .from('orders')
        .select('status')
        .gte('created_at', yesterday.toISOString()),
      supabase
        .from('payments')
        .select('status')
        .gte('created_at', yesterday.toISOString())
    ]);
    
    if (ordersStats.data && paymentsStats.data) {
      console.log('📊 Orders (Last 24h):');
      const orderStatusCount = ordersStats.data.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(orderStatusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      
      console.log('📊 Payments (Last 24h):');
      const paymentStatusCount = paymentsStats.data.reduce((acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(paymentStatusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }
    
    console.log('');
    console.log('✅ Payment status monitoring completed');
    
  } catch (error) {
    console.error('❌ Error during monitoring:', error);
    process.exit(1);
  }
}

// Auto-run if executed directly
if (require.main === module) {
  checkPaymentStatusSync();
}

module.exports = checkPaymentStatusSync;