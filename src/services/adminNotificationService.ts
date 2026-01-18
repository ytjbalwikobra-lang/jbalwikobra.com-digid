import { supabase } from './supabase';
import { supabaseAdmin } from './supabaseAdmin';
import { globalCache } from './globalCacheManager';

export interface AdminNotification {
  id: string;
  type: 'new_order' | 'paid_order' | 'new_user' | 'order_cancelled' | 'new_review' | 'system' | 'new_rent' | 'paid_rent';
  title: string;
  message: string;
  order_id?: string;
  user_id?: string;
  product_name?: string;
  amount?: number;
  customer_name?: string;
  created_at: string;
  is_read: boolean;
  metadata?: Record<string, any>;
}

class AdminNotificationService {
  private cacheTag = 'admin_notifications';

  // Get recent admin notifications
  async getAdminNotifications(limit = 10): Promise<AdminNotification[]> {
    const key = `${this.cacheTag}:recent:${limit}`;
    return globalCache.getOrSet(key, async () => {
      console.log(`🔄 Fetching admin notifications (limit: ${limit})`);
      try {
        // Prefer direct DB read if anon client has permissions
        if (supabase) {
          const { data, error } = await supabase
            .from('admin_notifications')
            .select('id, type, title, message, order_id, user_id, product_name, amount, customer_name, created_at, is_read, metadata')
            .order('created_at', { ascending: false })
            .limit(limit);

          if (!error && data) {
            console.log(`✅ Fetched ${data.length} admin notifications from DB`);
            return data as AdminNotification[];
          }
          if (error) throw error;
        }
      } catch (dbErr) {
        console.warn('⚠️ Direct DB fetch failed, will fallback to API proxy:', dbErr);
      }

      // Fallback to server API proxy using service-role on server
      try {
        const sessionToken = localStorage.getItem('session_token');
        const headers: Record<string, string> = {};
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        
        const resp = await fetch(`/api/admin-notifications?action=recent&limit=${encodeURIComponent(String(limit))}`, { headers });
        if (!resp.ok) throw new Error(`API ${resp.status}`);
        const body = await resp.json();
        const arr = (body?.data || []) as AdminNotification[];
        console.log(`✅ Fetched ${arr.length} admin notifications via API`);
        return arr;
      } catch (apiErr) {
        console.error('❌ Failed to fetch admin notifications via API:', apiErr);
        throw apiErr;
      }
    }, { ttl: 30_000, tags: [this.cacheTag] });
  }

  // Create new order notification
  async createOrderNotification(
    orderId: string, 
    customerName: string, 
    productName: string, 
    amount: number,
    type: 'new_order' | 'paid_order' | 'order_cancelled' = 'new_order',
    customerPhone?: string
  ): Promise<void> {
    try {
      const titles = {
        new_order: 'Bang! ada yang ORDER nih!',
        paid_order: 'Bang! ALHAMDULILLAH udah di bayar nih',
        order_cancelled: 'Bang! ada yang CANCEL order nih!'
      };

      const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(amount);
      };

      const messages = {
        new_order: `namanya ${customerName}, produknya ${productName} harganya ${formatAmount(amount)}, belum di bayar sih, tapi moga aja di bayar amin.`,
        paid_order: `namanya ${customerName}, produknya ${productName} harganya ${formatAmount(amount)}, udah di bayar Alhamdulillah.`,
        order_cancelled: `namanya ${customerName}, produktnya ${productName} di cancel nih.`
      };

      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }

      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          type,
          title: titles[type],
          message: messages[type],
          order_id: orderId,
          customer_name: customerName,
          product_name: productName,
          amount,
          is_read: false,
          metadata: {
            priority: type === 'paid_order' ? 'high' : 'normal',
            category: 'order'
          }
        });

      if (error) throw error;
      this.invalidateCache();
    } catch (error) {
      console.error('Failed to create order notification:', error);
    }
  }

  // Create new user signup notification
  async createUserSignupNotification(
    userId: string,
    userName: string,
    userPhone: string,
    email?: string
  ): Promise<void> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }
      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          type: 'new_user',
          title: 'Bang! ada yang DAFTAR akun nih!',
          message: `namanya ${userName} nomor wanya ${userPhone}`,
          user_id: userId,
          customer_name: userName,
          is_read: false,
          metadata: {
            email,
            phone: userPhone,
            priority: 'normal',
            category: 'user'
          }
        });

      if (error) throw error;
      this.invalidateCache();
    } catch (error) {
      console.error('Failed to create user signup notification:', error);
    }
  }

  // Create review notification
  async createReviewNotification(
    productName: string,
    customerName: string,
    rating: number
  ): Promise<void> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }
      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          type: 'new_review',
          title: 'Bang! ada yang REVIEW produk nih!',
          message: `namanya ${customerName} memberikan ulasan ${rating} bintang untuk produk ${productName}`,
          product_name: productName,
          customer_name: customerName,
          is_read: false,
          metadata: {
            rating,
            priority: 'low',
            category: 'review'
          }
        });

      if (error) throw error;
      this.invalidateCache();
    } catch (error) {
      console.error('Failed to create review notification:', error);
    }
  }

  // Mark notification as read - MUST use admin client for write operations
  async markAsRead(notificationId: string): Promise<void> {
    try {
      console.log(`🔄 Marking notification ${notificationId} as read...`);
      
      // Check which client is available
      console.log(`🔧 supabaseAdmin available: ${!!supabaseAdmin}`);
      console.log(`🔧 supabase available: ${!!supabase}`);
      
      // CRITICAL: Admin operations MUST use service key to bypass RLS
      if (!supabaseAdmin) {
        console.warn('⚠️ Service key client not available on client. Using server API.');
        try {
          const sessionToken = localStorage.getItem('session_token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (sessionToken) {
            headers['Authorization'] = `Bearer ${sessionToken}`;
          }
          
          const resp = await fetch('/api/admin-notifications?action=mark-read', {
            method: 'POST',
            headers,
            body: JSON.stringify({ id: notificationId })
          });
          if (!resp.ok) throw new Error(`API ${resp.status}`);
          globalCache.clear();
          console.log('🧹 Cache cleared after marking as read via API');
          return;
        } catch (apiErr) {
          console.error('❌ API mark-read failed, attempting direct client (may fail with RLS)...', apiErr);
          if (supabase) {
            const updatePayload = { is_read: true, updated_at: new Date().toISOString() };
            const { error } = await supabase
              .from('admin_notifications')
              .update(updatePayload)
              .eq('id', notificationId);
            if (error) throw error;
            globalCache.clear();
            return;
          }
          throw apiErr;
        }
      }
      
      console.log(`🔧 Using Admin client (Service Key) - required for admin operations`);
      
      // First, let's verify the notification exists
      const { data: existingNotification, error: selectError } = await supabaseAdmin
        .from('admin_notifications')
        .select('id, is_read, title')
        .eq('id', notificationId)
        .single();
        
      if (selectError) {
        console.error('❌ Error finding notification:', selectError);
        throw selectError;
      }
      
      if (!existingNotification) {
        throw new Error(`Notification ${notificationId} not found`);
      }
      
      console.log(`📋 Found notification:`, existingNotification);
      
      // Now perform the update with service key (bypasses RLS)
      const updatePayload = { 
        is_read: true, 
        updated_at: new Date().toISOString() 
      };
      
      console.log(`📝 Update payload:`, updatePayload);
      
      const { data, error } = await supabaseAdmin
        .from('admin_notifications')
        .update(updatePayload)
        .eq('id', notificationId)
        .select();

      if (error) {
        console.error('❌ Database error when marking as read:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn('⚠️ Update completed but no rows returned');
      } else {
        console.log('✅ Successfully updated notification in database:', data[0]);
        console.log(`✅ Confirmed: is_read = ${data[0].is_read}`);
      }
      
      // Verify the update by reading it back
      const { data: verifyData, error: verifyError } = await supabaseAdmin
        .from('admin_notifications')
        .select('id, is_read, updated_at')
        .eq('id', notificationId)
        .single();
        
      if (verifyError) {
        console.error('❌ Error verifying update:', verifyError);
      } else {
        console.log('🔍 Verification result:', verifyData);
        if (verifyData.is_read === true) {
          console.log('✅ Database update confirmed - is_read is now true');
        } else {
          console.error('❌ Database update failed - is_read is still false');
        }
      }
      
      this.invalidateCache();
      console.log('✅ Cache invalidated after mark as read');
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      throw error; // Re-throw so calling code can handle it
    }
  }

  // Mark all as read - MUST use admin client for write operations  
  async markAllAsRead(): Promise<void> {
    try {
      console.log('🔄 Marking all notifications as read...');
      
      // Prefer service-role client if available, else fallback to API
      if (supabaseAdmin) {
        console.log('🔧 Using Admin client (Service Key) for mark all as read');
        const { error } = await supabaseAdmin
          .from('admin_notifications')
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq('is_read', false);
        if (error) throw error;
        this.invalidateCache();
        console.log('✅ Cache invalidated after mark all as read');
        return;
      }

      // API fallback
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const resp = await fetch('/api/admin-notifications?action=mark-all', { 
        method: 'POST',
        headers
      });
      if (!resp.ok) throw new Error(`API ${resp.status}`);
      this.invalidateCache();
      console.log('✅ Cache invalidated after mark all (API)');
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const key = `${this.cacheTag}:unread_count`;
    return globalCache.getOrSet(key, async () => {
      if (!supabase) {
        console.error('Supabase client not available');
        return 0;
      }
      const { count, error } = await supabase
        .from('admin_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    }, { ttl: 20_000, tags: [this.cacheTag] });
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      this.invalidateCache();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }

  // Create test notification for debug purposes
  async createTestNotification(): Promise<void> {
    try {
      const currentTime = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }
      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          type: 'new_review',
          title: 'Bang! ini test notifikasi nih!',
          message: `Test notifikasi berhasil dibuat pada jam ${currentTime}, sistem notifikasi berjalan normal!`,
          is_read: true, // Mark as read immediately so it doesn't show in floating notifications
          metadata: {
            priority: 'low',
            category: 'debug',
            test: true,
            debug_mode: true,
            auto_read: true,
            created_time: currentTime
          }
        });

      if (error) throw error;
      this.invalidateCache();
    } catch (error) {
      console.error('Failed to create test notification:', error);
      throw error;
    }
  }

  private invalidateCache(): void {
    globalCache.invalidateByTags([this.cacheTag]);
  }

  // Clear cache manually (for debugging)
  clearCache(): void {
    globalCache.invalidateByTags([this.cacheTag]);
    console.log('✅ Admin notifications cache cleared manually');
  }

  // Debug method to test mark as read functionality
  async debugMarkAsRead(notificationId: string): Promise<void> {
    console.log('🐛 DEBUG: Testing mark as read functionality');
    console.log(`🔍 Notification ID: ${notificationId}`);
    
    try {
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }
      // First, check if notification exists and current state
      const { data: beforeData, error: beforeError } = await supabase
        .from('admin_notifications')
        .select('id, type, title, message, is_read, created_at, updated_at')
        .eq('id', notificationId)
        .single();
      
      if (beforeError) {
        console.error('❌ DEBUG: Notification not found:', beforeError);
        return;
      }
      
      console.log('📋 DEBUG: Before update:', {
        id: beforeData.id,
        title: beforeData.title,
        is_read: beforeData.is_read,
        created_at: beforeData.created_at,
        updated_at: beforeData.updated_at
      });
      
      // Perform the update
      console.log('🔄 DEBUG: Performing mark as read update...');
      const { data: updateData, error: updateError } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .select();
      
      if (updateError) {
        console.error('❌ DEBUG: Update failed:', updateError);
        return;
      }
      
      console.log('✅ DEBUG: Update successful:', updateData);
      
      // Verify the update
      const { data: afterData, error: afterError } = await supabase
        .from('admin_notifications')
        .select('id, type, title, message, is_read, created_at, updated_at')
        .eq('id', notificationId)
        .single();
      
      if (afterError) {
        console.error('❌ DEBUG: Failed to verify update:', afterError);
        return;
      }
      
      console.log('🔍 DEBUG: After update:', {
        id: afterData.id,
        title: afterData.title,
        is_read: afterData.is_read,
        created_at: afterData.created_at,
        updated_at: afterData.updated_at
      });
      
      // Clear cache
      this.invalidateCache();
      console.log('🗑️ DEBUG: Cache invalidated');
      
      console.log('✅ DEBUG: Mark as read test completed successfully');
      
    } catch (error) {
      console.error('❌ DEBUG: Mark as read test failed:', error);
    }
  }
}

export const adminNotificationService = new AdminNotificationService();
