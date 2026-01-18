#!/usr/bin/env node

/**
 * Product Name Notification Test
 * 
 * This script tests the notification system to ensure product names
 * are correctly retrieved and displayed in notifications
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testProductNameRetrieval() {
  console.log('🧪 Testing Product Name Retrieval for Notifications');
  console.log('==================================================');
  console.log('');

  try {
    // Test the query structure used in notifications
    console.log('1️⃣ Testing notification query structure...');
    
    const { data: orders, error: queryError } = await supabase
      .from('orders')
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        amount,
        status,
        order_type,
        rental_duration,
        product_id,
        products:product_id (
          id,
          name,
          price,
          description
        )
      `)
      .in('status', ['paid', 'completed', 'pending']) // Include pending for testing
      .order('created_at', { ascending: false })
      .limit(5);

    if (queryError) {
      console.error('❌ Query error:', queryError);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('⚠️ No orders found to test with');
      return;
    }

    console.log(`✅ Found ${orders.length} orders for testing`);
    console.log('');

    // Test each order
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      console.log(`📋 Order ${i + 1}:`);
      console.log(`   ID: ${order.id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Product ID: ${order.product_id || 'None'}`);
      console.log(`   Product relationship data:`, order.products ? JSON.stringify(order.products, null, 2) : 'None');
      
      // Test the same logic as in notifications
      let productName = order.products?.name;
      
      if (!productName && order.product_id) {
        console.log('   🔍 Product name not found in relationship, trying direct fetch...');
        try {
          const { data: productData } = await supabase
            .from('products')
            .select('name')
            .eq('id', order.product_id)
            .single();
          productName = productData?.name;
          console.log(`   ✅ Direct fetch result: ${productName}`);
        } catch (fetchError) {
          console.log(`   ❌ Direct fetch failed:`, fetchError.message);
        }
      }
      
      productName = productName || 'Unknown Product';
      console.log(`   🏷️ Final product name: "${productName}"`);
      
      if (productName === 'Unknown Product') {
        console.log('   ⚠️ WARNING: Product name resolved to "Unknown Product"');
      } else {
        console.log('   ✅ Product name resolved successfully');
      }
      
      console.log('   ---');
    }
    
    console.log('');
    
    // Test direct product fetch for comparison
    console.log('2️⃣ Testing direct product queries...');
    
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .limit(5);
      
    if (productError) {
      console.error('❌ Product query error:', productError);
    } else {
      console.log(`✅ Found ${products?.length || 0} products:`);
      products?.forEach((product, index) => {
        console.log(`   ${index + 1}. ID: ${product.id}, Name: "${product.name}"`);
      });
    }
    
    console.log('');
    console.log('✅ Product name retrieval test completed');
    
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

// Auto-run if executed directly
if (require.main === module) {
  testProductNameRetrieval();
}

module.exports = testProductNameRetrieval;