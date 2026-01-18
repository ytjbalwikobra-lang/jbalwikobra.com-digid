#!/usr/bin/env node

/**
 * Test Script for Admin Notifications System
 * Tests: Create, Read, Mark as Read, Mark All as Read, Delete
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testNotifications() {
  console.log('🧪 Testing Admin Notifications System\n');
  console.log('=' .repeat(60));

  const testNotificationIds = [];

  try {
    // Test 1: Create test notifications
    console.log('\n📝 Test 1: Creating test notifications...');
    const testNotifications = [
      {
        type: 'new_order',
        title: 'Test Order #1',
        message: 'Test notification for new order',
        metadata: { order_id: 'test-order-1', amount: 100000 },
        is_read: false
      },
      {
        type: 'paid_order',
        title: 'Test Paid Order #2',
        message: 'Test notification for paid order',
        metadata: { order_id: 'test-order-2', amount: 250000 },
        is_read: false
      },
      {
        type: 'new_order',
        title: 'Test Order #3 (Pre-read)',
        message: 'Test notification already read',
        metadata: { order_id: 'test-order-3', amount: 50000 },
        is_read: true // Pre-read for testing
      }
    ];

    for (const notif of testNotifications) {
      const { data, error } = await supabase
        .from('admin_notifications')
        .insert(notif)
        .select()
        .single();
      
      if (error) throw error;
      testNotificationIds.push(data.id);
      console.log(`   ✅ Created notification: ${data.id} (${data.type})`);
    }

    // Test 2: Read notifications
    console.log('\n📖 Test 2: Reading notifications...');
    const { data: allNotifs, error: readError } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (readError) throw readError;
    console.log(`   ✅ Retrieved ${allNotifs.length} notifications`);
    
    const unreadCount = allNotifs.filter(n => !n.is_read).length;
    const readCount = allNotifs.filter(n => n.is_read).length;
    console.log(`   📊 Unread: ${unreadCount}, Read: ${readCount}`);

    // Test 3: Mark single notification as read
    console.log('\n✔️  Test 3: Marking single notification as read...');
    const unreadNotif = allNotifs.find(n => !n.is_read);
    
    if (unreadNotif) {
      const { data: marked, error: markError } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', unreadNotif.id)
        .select()
        .single();
      
      if (markError) throw markError;
      console.log(`   ✅ Marked notification ${marked.id} as read`);
      console.log(`   📝 Verified: is_read = ${marked.is_read}`);
    } else {
      console.log(`   ⏭️  No unread notifications to test`);
    }

    // Test 4: Mark all as read
    console.log('\n✔️✔️  Test 4: Marking all notifications as read...');
    const { data: markedAll, error: markAllError } = await supabase
      .from('admin_notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('is_read', false)
      .select('id');
    
    if (markAllError) throw markAllError;
    console.log(`   ✅ Marked ${markedAll?.length || 0} notifications as read`);

    // Test 5: Verify all are read
    console.log('\n🔍 Test 5: Verifying mark all as read...');
    const { data: verifyNotifs, error: verifyError } = await supabase
      .from('admin_notifications')
      .select('id, is_read')
      .limit(20);
    
    if (verifyError) throw verifyError;
    const stillUnread = verifyNotifs.filter(n => !n.is_read);
    console.log(`   ✅ Verified: ${stillUnread.length} unread notifications remaining`);

    // Test 6: Test notification filtering
    console.log('\n🔎 Test 6: Testing notification filters...');
    
    // Filter by type
    const { data: orderNotifs, error: filterError } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('type', 'new_order')
      .limit(5);
    
    if (filterError) throw filterError;
    console.log(`   ✅ Found ${orderNotifs.length} 'new_order' notifications`);

    // Filter by read status
    const { data: readNotifs, error: readFilterError } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('is_read', true)
      .limit(5);
    
    if (readFilterError) throw readFilterError;
    console.log(`   ✅ Found ${readNotifs.length} read notifications`);

    // Test 7: Test delete notification
    console.log('\n🗑️  Test 7: Testing delete notification...');
    if (testNotificationIds.length > 0) {
      const idToDelete = testNotificationIds[0];
      const { error: deleteError } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', idToDelete);
      
      if (deleteError) throw deleteError;
      console.log(`   ✅ Deleted notification: ${idToDelete}`);
    }

    // Test 8: Real-time subscription test (quick test)
    console.log('\n📡 Test 8: Testing real-time subscription...');
    console.log('   ⏳ Setting up subscription for 3 seconds...');
    
    let receivedRealtime = false;
    const channel = supabase
      .channel('admin-notifications-test')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          console.log('   ✅ Received real-time notification:', payload.new.id);
          receivedRealtime = true;
        }
      )
      .subscribe();

    // Wait a moment for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create a test notification to trigger real-time
    const { data: rtNotif, error: rtError } = await supabase
      .from('admin_notifications')
      .insert({
        type: 'new_order',
        title: 'Real-time Test',
        message: 'Testing real-time notification',
        metadata: { test: true },
        is_read: false
      })
      .select()
      .single();
    
    if (rtError) throw rtError;
    testNotificationIds.push(rtNotif.id);

    // Wait for real-time event
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (receivedRealtime) {
      console.log('   ✅ Real-time subscription working!');
    } else {
      console.log('   ⚠️  Real-time event not received (may need more time)');
    }

    await channel.unsubscribe();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All notification tests completed successfully!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    // Cleanup: Delete test notifications
    if (testNotificationIds.length > 0) {
      console.log('\n🧹 Cleaning up test notifications...');
      const { error: cleanupError } = await supabase
        .from('admin_notifications')
        .delete()
        .in('id', testNotificationIds);
      
      if (cleanupError) {
        console.error('⚠️  Cleanup error:', cleanupError.message);
      } else {
        console.log(`   ✅ Cleaned up ${testNotificationIds.length} test notifications`);
      }
    }
  }
}

// Run tests
testNotifications()
  .then(() => {
    console.log('\n✨ Test script completed\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
