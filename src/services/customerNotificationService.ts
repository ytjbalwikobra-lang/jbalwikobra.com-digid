/**
 * Customer Notification Service
 * 
 * Handles customer-facing notifications (payment confirmations, order updates, promos).
 * Reads from the `customer_notifications` and `customer_notification_reads` tables.
 * 
 * NOT to be confused with:
 * - adminNotificationService (src/services/adminNotificationService.ts) → admin panel notifications
 * - api/_utils/adminNotificationService.ts → backend admin notification creation
 */

import { supabase } from './supabase';
import { globalCache } from './globalCacheManager';

export interface CustomerNotification {
  id: string;
  user_id?: string | null;
  type: 'product' | 'feed_post' | 'system' | 'payment' | 'order';
  title: string;
  body?: string | null;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}

/** @deprecated Use CustomerNotification instead */
export type AppNotification = CustomerNotification;

class CustomerNotificationService {
  private cacheTag = 'customer_notifications';

  async getLatest(limit = 10, userId?: string | null): Promise<CustomerNotification[]> {
    const key = `${this.cacheTag}:latest:${limit}:${userId || 'guest'}`;
    return globalCache.getOrSet(key, async () => {
      if (!supabase) {
        return [];
      }
      let query = supabase
        .from('customer_notifications')
        .select('id,user_id,type,title,body,link_url,is_read,created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        // For signed-in users: show user-specific and global (user_id is null)
        // Supabase does not support OR easily in client; fetch two small lists and merge.
        const [userRes, globalRes, readsRes] = await Promise.all([
          query.eq('user_id', userId),
          supabase
            .from('customer_notifications')
            .select('id,user_id,type,title,body,link_url,is_read,created_at')
            .is('user_id', null)
            .order('created_at', { ascending: false })
            .limit(limit),
          supabase
            .from('customer_notification_reads')
            .select('notification_id')
            .eq('user_id', userId)
        ]);
        const readMap = new Set<string>((readsRes.data || []).map((r: any) => r.notification_id));
        const merged = [...(userRes.data || []), ...(globalRes.data || [])] as CustomerNotification[];
        // For global notifications, compute is_read for this user using customer_notification_reads
        const list = merged
          .map(n => ({
            ...n,
            is_read: n.user_id ? n.is_read : readMap.has(n.id)
          }))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit) as CustomerNotification[];
        return list;
      }

      // Guests: show only global notifications
      const { data, error } = await query.is('user_id', null);
      if (error) throw error;
      return (data || []) as CustomerNotification[];
  }, { ttl: 30_000 });
  }

  async getUnreadCount(userId?: string | null): Promise<number> {
    const key = `${this.cacheTag}:unread-count:${userId || 'guest'}`;
    return globalCache.getOrSet(key, async () => {
      if (!supabase) {
        return 0;
      }
      if (!userId) {
        // Guests: count all global as unread, but limit egress by fetching only count
        const { count, error } = await supabase
          .from('customer_notifications')
          .select('id', { count: 'exact', head: true })
          .is('user_id', null);
        if (error) {
          console.warn('[CustomerNotificationService] Failed to get guest notification count:', error);
          return 0;
        }
        return count || 0;
      }
      // Try to use RPC to minimize round trips, fall back to direct query if RPC doesn't exist
      try {
        const { data, error } = await supabase.rpc('get_unread_notification_count', { u_id: userId });
        if (error) {
          // If RPC doesn't exist (404/42P01), fall back to direct query
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.warn('[CustomerNotificationService] RPC function not found, using fallback query');
            return this.getUnreadCountFallback(userId);
          }
          throw error;
        }
        return (data as number) ?? 0;
      } catch (err) {
        console.warn('[CustomerNotificationService] RPC failed, using fallback:', err);
        return this.getUnreadCountFallback(userId);
      }
    }, { ttl: 20_000 });
  }

  // Fallback method for counting unread notifications without RPC
  private async getUnreadCountFallback(userId: string): Promise<number> {
    if (!supabase) return 0;
    
    try {
      // Count user-specific unread notifications
      const { count: userCount } = await supabase
        .from('customer_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      // Count global notifications
      const { count: globalCount } = await supabase
        .from('customer_notifications')
        .select('id', { count: 'exact', head: true })
        .is('user_id', null);
      
      // Count how many global notifications user has read
      const { count: readCount } = await supabase
        .from('customer_notification_reads')
        .select('notification_id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      return (userCount || 0) + (globalCount || 0) - (readCount || 0);
    } catch (error) {
      console.error('[CustomerNotificationService] Fallback count failed:', error);
      return 0;
    }
  }

  async markAsRead(notificationId: string, userId?: string | null): Promise<void> {
    if (!userId) return; // guests: skip
    if (!supabase) return;
    try {
      
      // Try to use RPC, fall back to direct query if RPC doesn't exist
      try {
        const { error } = await supabase.rpc('mark_notification_read', { n_id: notificationId, u_id: userId });
        if (error) {
          // If RPC doesn't exist, fall back to direct query
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.warn('[CustomerNotificationService] RPC function not found, using fallback');
            await this.markAsReadFallback(notificationId, userId);
          } else {
            throw error;
          }
        }
      } catch (err: any) {
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          console.warn('[CustomerNotificationService] RPC failed, using fallback:', err);
          await this.markAsReadFallback(notificationId, userId);
        } else {
          throw err;
        }
      }
      
      // More comprehensive cache invalidation
      this.invalidateCache(userId);
    } catch (e) {
      console.error('[CustomerNotificationService] markAsRead failed:', e);
      // Don't re-throw, just log - fail silently for better UX
    }
  }

  // Fallback method for marking notification as read without RPC
  private async markAsReadFallback(notificationId: string, userId: string): Promise<void> {
    if (!supabase) return;
    
    // Get the notification to check if it's user-specific or global
    const { data: notif } = await supabase
      .from('customer_notifications')
      .select('user_id')
      .eq('id', notificationId)
      .single();
    
    if (!notif) return;
    
    // If user-specific, update is_read
    if (notif.user_id === userId) {
      await supabase
        .from('customer_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);
    }
    // If global, insert into customer_notification_reads
    else if (notif.user_id === null) {
      await supabase
        .from('customer_notification_reads')
        .insert({ notification_id: notificationId, user_id: userId, read_at: new Date().toISOString() })
        .select()
        .single();
    }
  }

  async markAllAsRead(userId?: string | null): Promise<void> {
    if (!userId) return; // guests: skip
    if (!supabase) return;
    try {
      
      // Try to use RPC, fall back to direct query if RPC doesn't exist
      try {
        const { error } = await supabase.rpc('mark_all_notifications_read', { u_id: userId });
        if (error) {
          // If RPC doesn't exist, fall back to direct query
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.warn('[CustomerNotificationService] RPC function not found, using fallback');
            await this.markAllAsReadFallback(userId);
          } else {
            throw error;
          }
        }
      } catch (err: any) {
        if (err.code === '42P01' || err.message?.includes('does not exist')) {
          console.warn('[CustomerNotificationService] RPC failed, using fallback:', err);
          await this.markAllAsReadFallback(userId);
        } else {
          throw err;
        }
      }
      
      // More comprehensive cache invalidation
      this.invalidateCache(userId);
    } catch (e) {
      console.error('[CustomerNotificationService] markAllAsRead failed:', e);
      // Don't re-throw, just log - fail silently for better UX
    }
  }

  // Fallback method for marking all notifications as read without RPC
  private async markAllAsReadFallback(userId: string): Promise<void> {
    if (!supabase) return;
    
    // Mark all user-specific notifications as read
    await supabase
      .from('customer_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    // For global notifications, get all unread ones and insert into customer_notification_reads
    const { data: globalNotifs } = await supabase
      .from('customer_notifications')
      .select('id')
      .is('user_id', null);
    
    if (globalNotifs && globalNotifs.length > 0) {
      const reads = globalNotifs.map(n => ({
        notification_id: n.id,
        user_id: userId,
        read_at: new Date().toISOString()
      }));
      
      // Insert with upsert behavior
      await supabase
        .from('customer_notification_reads')
        .upsert(reads, { onConflict: 'notification_id,user_id' });
    }
  }

  private invalidateCache(userId?: string | null): void {
    // Clear all notification-related caches for this user
    const userKey = userId || 'guest';
    const keysToDelete = [
      `${this.cacheTag}:latest:10:${userKey}`,
      `${this.cacheTag}:unread-count:${userKey}`,
    ];

    // Also try common cache key patterns
    if (userId) {
      keysToDelete.push(
        `${this.cacheTag}:latest:10:${userId}`,
        `${this.cacheTag}:unread-count:${userId}`,
        `${this.cacheTag}:latest:5:${userId}`,
        `${this.cacheTag}:latest:20:${userId}`
      );
    }

    keysToDelete.forEach(key => {
      globalCache.delete(key);
    });

    // Also invalidate by tags if we have them
    globalCache.invalidateByTags([this.cacheTag, 'customer-notifications']);
  }
}

export const customerNotificationService = new CustomerNotificationService();

/** @deprecated Use customerNotificationService instead */
export const notificationService = customerNotificationService;
