import { supabase } from './supabase';
import { supabaseAdmin } from './supabaseAdmin';
import { globalCache } from './globalCacheManager';
import { formatCurrency } from '../utils/helpers';

// Development mode detection
const isDev = process.env.NODE_ENV === 'development';

/**
 * Retry helper for admin notification API calls with exponential backoff
 * Handles 401 errors that may occur due to race conditions after login
 * In development mode, allows requests without session token (API handles dev auth)
 */
async function fetchNotificationsWithRetry(
  url: string,
  maxRetries = 3,
  baseDelay = 500
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Get session token (optional in dev mode)
    const sessionToken = localStorage.getItem('session_token');
    
    // In production, require session token
    if (!isDev && !sessionToken) {
      // Wait for session token to be set
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }
      throw new Error('No session token available');
    }
    
    const headers: Record<string, string> = {};
    
    // Add auth header if token exists
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    try {
      const response = await fetch(url, { headers });
      
      // If 401 and we have retries left (and not in dev mode), wait and retry
      if (response.status === 401 && !isDev && attempt < maxRetries - 1) {
        console.warn(`[adminNotificationService] 401 received, retrying in ${baseDelay * Math.pow(2, attempt)}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError || new Error('Failed after max retries');
}

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
      // Always use API proxy for admin notifications to ensure proper authentication
      // Direct DB access may be blocked by RLS policies
      try {
        // Use retry helper to handle 401 race conditions after login
        const resp = await fetchNotificationsWithRetry(
          `/api/admin-notifications?action=recent&limit=${encodeURIComponent(String(limit))}`
        );
        if (!resp.ok) {
          throw new Error(`API ${resp.status}`);
        }
        const body = await resp.json();
        const arr = (body?.data || []) as AdminNotification[];
        return arr;
      } catch (apiErr) {
        console.error('Failed to fetch admin notifications via API:', apiErr);
        return []; // Return empty array instead of throwing
      }
    }, { ttl: 300_000, tags: [this.cacheTag] }); // 5 minutes cache to reduce egress
  }

  // Create new order notification
  async createOrderNotification(
    orderId: string, 
    customerName: string, 
    productName: string, 
    amount: number,
    type: 'new_order' | 'paid_order' | 'order_cancelled' | 'new_rent' | 'paid_rent' = 'new_order',
    customerPhone?: string,
    orderType?: 'purchase' | 'rental'
  ): Promise<void> {
    try {
      const isRental = orderType === 'rental';
      
      // Map types to rental-specific types when orderType is rental
      let finalType = type;
      if (isRental) {
        if (type === 'new_order') finalType = 'new_rent';
        else if (type === 'paid_order') finalType = 'paid_rent';
      }
      
      const titles: Record<string, string> = {
        new_order: 'Pesanan Pembelian Baru',
        paid_order: 'Pembayaran Pembelian Diterima',
        new_rent: 'Pesanan Penyewaan Baru',
        paid_rent: 'Pembayaran Penyewaan Diterima',
        order_cancelled: isRental 
          ? 'Pesanan Penyewaan Dibatalkan' 
          : 'Pesanan Pembelian Dibatalkan'
      };

      const messages: Record<string, string> = {
        new_order: `${customerName} memesan ${productName} senilai ${formatCurrency(amount)}. Menunggu pembayaran.`,
        paid_order: `${customerName} telah membayar pesanan ${productName} senilai ${formatCurrency(amount)}.`,
        new_rent: `${customerName} menyewa ${productName} senilai ${formatCurrency(amount)}. Menunggu pembayaran.`,
        paid_rent: `${customerName} telah membayar sewa ${productName} senilai ${formatCurrency(amount)}.`,
        order_cancelled: `${customerName} membatalkan pesanan ${productName}.`
      };

      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }

      // Determine if this is a payment notification
      const isPaidNotification = finalType === 'paid_order' || finalType === 'paid_rent';

      const { error } = await supabase
        .from('admin_notifications')
        .insert({
          type: finalType,
          title: titles[finalType],
          message: messages[finalType],
          order_id: orderId,
          customer_name: customerName,
          product_name: productName,
          amount,
          is_read: false,
          metadata: {
            priority: isPaidNotification ? 'high' : 'normal',
            category: isPaidNotification ? 'payment' : 'order',
            order_type: orderType || 'purchase'
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
          title: 'Pengguna Baru Terdaftar',
          message: `${userName} mendaftar dengan nomor telepon ${userPhone}.`,
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
          title: 'Ulasan Produk Baru',
          message: `${customerName} memberikan ulasan ${rating} bintang untuk ${productName}.`,
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
      // CRITICAL: Admin operations MUST use service key to bypass RLS
      if (!supabaseAdmin) {
        // Use server API
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
          return;
        } catch (apiErr) {
          // Fallback to direct client if API fails
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
      
      // Use Admin client (Service Key)
      const { error } = await supabaseAdmin
        .from('admin_notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      this.invalidateCache();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  // Mark all as read - MUST use admin client for write operations  
  async markAllAsRead(): Promise<void> {
    try {
      // Prefer service-role client if available, else fallback to API
      if (supabaseAdmin) {
        const { error } = await supabaseAdmin
          .from('admin_notifications')
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq('is_read', false);
        if (error) throw error;
        this.invalidateCache();
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
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
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
  }

  // Debug method to test mark as read functionality
  async debugMarkAsRead(notificationId: string): Promise<void> {
    
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
      
      // Perform the update
      const { data: updateData, error: updateError } = await supabase
        .from('admin_notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .select();
      
      if (updateError) {
        console.error('❌ DEBUG: Update failed:', updateError);
        return;
      }
      
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
      
      // Clear cache
      this.invalidateCache();
      
    } catch (error) {
      console.error('❌ DEBUG: Mark as read test failed:', error);
    }
  }
}

export const adminNotificationService = new AdminNotificationService();
