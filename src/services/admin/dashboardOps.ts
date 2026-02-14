/**
 * admin/dashboardOps.ts
 * Statistik dashboard, analytics time-series, dan top products
 */

import { adminCache } from '../adminCache';
import { supabase } from '../supabase';
import { fetchWithRetry } from './helpers';
import type { AdminStats, OrderDayStat, OrderStatusDayStat, TopProductStat, AdminNotification } from './types';

// Cache internal untuk dashboard stats (instant loading)
let _dashboardStatsCache: { data: AdminStats; timestamp: number } | null = null;
const _dashboardStatsCacheDuration = 60 * 1000; // 1 menit

/** Ambil statistik admin via RPC (1 query, server-side aggregation) */
export async function getAdminStats(): Promise<AdminStats> {
  if (!supabase) {
    console.warn('⚠️ [getAdminStats] Supabase not configured, returning fallback');
    return { totalOrders: 0, totalRevenue: 0, totalUsers: 0, totalProducts: 0, totalReviews: 0, averageRating: 0, pendingOrders: 0, completedOrders: 0, totalFlashSales: 0, activeFlashSales: 0, activeRentals: 0 };
  }

  return adminCache.getOrFetch('admin:stats', async () => {
    try {
      // 1 RPC call menggantikan 7+ query terpisah — hemat egress ~95%
      const { data, error } = await (supabase as any).rpc('get_dashboard_stats');
      if (!error && data) {
        return {
          totalOrders: data.totalOrders || 0,
          totalRevenue: Number(data.totalRevenue) || 0,
          totalUsers: data.totalUsers || 0,
          totalProducts: data.totalProducts || 0,
          totalReviews: data.totalReviews || 0,
          averageRating: Number(data.averageRating) || 0,
          pendingOrders: data.pendingOrders || 0,
          completedOrders: data.completedOrders || 0,
          totalFlashSales: data.totalFlashSales || 0,
          activeFlashSales: data.activeFlashSales || 0,
          activeRentals: data.activeRentals || 0,
        };
      }
      console.warn('[getAdminStats] RPC fallback — error:', error?.message);
      // Fallback minimal jika RPC belum di-deploy
      const [{ count: totalOrders }, { count: totalUsers }, { count: totalProducts }] = await Promise.all([
        (supabase as any).from('orders').select('id', { count: 'exact', head: true }),
        (supabase as any).from('users').select('id', { count: 'exact', head: true }),
        (supabase as any).from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);
      return {
        totalOrders: totalOrders || 0, totalRevenue: 0, totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0, totalReviews: 0, averageRating: 0,
        pendingOrders: 0, completedOrders: 0, totalFlashSales: 0, activeFlashSales: 0, activeRentals: 0
      };
    } catch (error) {
      console.error('❌ [getAdminStats] Error:', error);
      return { totalOrders: 0, totalRevenue: 0, totalUsers: 0, totalProducts: 0, totalReviews: 0, averageRating: 0, pendingOrders: 0, completedOrders: 0, totalFlashSales: 0, activeFlashSales: 0, activeRentals: 0 };
    }
  });
}

/** Cache invalidation helpers */
export function clearStatsCache(): void { adminCache.invalidate('admin:stats'); }
export function clearOrdersCache(): void { adminCache.invalidatePattern('admin:orders:'); }
export function clearUsersCache(): void { adminCache.invalidatePattern('admin:users:'); }
export function invalidateCache(pattern?: string): void { pattern ? adminCache.invalidatePattern(pattern) : adminCache.clear(); }

/** Prefetch data dashboard */
export async function prefetchDashboardData(): Promise<void> {
  await adminCache.prefetchBatch([{ key: 'admin:stats', fetchFn: () => getAdminStats() }]);
}

/** Dashboard stats via admin API (cached, fallback ke getAdminStats) */
export async function getDashboardStats(): Promise<AdminStats> {
  const now = Date.now();
  if (_dashboardStatsCache && (now - _dashboardStatsCache.timestamp) < _dashboardStatsCacheDuration) {
    return _dashboardStatsCache.data;
  }
  try {
    const response = await fetchWithRetry('/api/admin?action=dashboard-stats', { method: 'GET' });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const data = await response.json();
    const stats: AdminStats = {
      totalOrders: data.orders?.count || 0, totalRevenue: data.orders?.revenue || 0,
      totalUsers: data.users?.count || 0, totalProducts: data.products?.count || 0,
      totalReviews: data.reviews?.count || 0, averageRating: data.reviews?.averageRating || 0,
      pendingOrders: data.orders?.pending || 0, completedOrders: data.orders?.completed || 0,
      totalFlashSales: data.flashSales?.count || 0, activeFlashSales: 0,
      activeRentals: data.activeRentals || 0
    };
    _dashboardStatsCache = { data: stats, timestamp: now };
    return stats;
  } catch (error) {
    console.error('[getDashboardStats] Error calling API:', error);
    return getAdminStats();
  }
}

/** Time-series order per hari (via RPC — server-side aggregation) */
export async function getOrdersTimeSeries(params?: { startDate?: string; endDate?: string; days?: number }): Promise<OrderDayStat[]> {
  if (!supabase) throw new Error('Supabase client not available');
  try {
    const days = params?.days || 7;
    const end = params?.endDate ? new Date(params.endDate) : new Date();
    const start = params?.startDate ? new Date(params.startDate) : new Date(end.getTime() - (days - 1) * 86400000);
    const startISO = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
    const endISO = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString();

    // Inisialisasi bucket kosong untuk semua hari
    const dailyStats: Record<string, { count: number; revenue: number }> = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { dailyStats[d.toISOString().slice(0, 10)] = { count: 0, revenue: 0 }; }

    // RPC: agregasi di database, return hanya summary per hari (bukan ribuan baris)
    const { data, error } = await (supabase as any).rpc('get_orders_time_series', {
      p_start_date: startISO,
      p_end_date: endISO
    });

    if (!error && data) {
      (data as any[]).forEach((row: any) => {
        if (dailyStats[row.date]) {
          dailyStats[row.date].count = Number(row.total_count) || 0;
          dailyStats[row.date].revenue = Number(row.revenue) || 0;
        }
      });
    } else if (error) {
      console.warn('[getOrdersTimeSeries] RPC error, fallback ke query terbatas:', error.message);
      // Fallback: query hanya kolom minimal dengan limit
      const { data: orders } = await supabase.from('orders')
        .select('created_at, amount, status')
        .gte('created_at', startISO).lte('created_at', endISO)
        .limit(1000);
      (orders || []).forEach(order => {
        const key = new Date(order.created_at).toISOString().slice(0, 10);
        if (dailyStats[key]) {
          dailyStats[key].count += 1;
          if (order.status === 'paid' || order.status === 'completed') dailyStats[key].revenue += Number(order.amount) || 0;
        }
      });
    }

    return Object.entries(dailyStats).map(([date, s]) => ({ date, ...s })).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error in getOrdersTimeSeries:', error);
    const days = params?.days || 7; const end = params?.endDate ? new Date(params.endDate) : new Date();
    const start = params?.startDate ? new Date(params.startDate) : new Date(end.getTime() - (days - 1) * 86400000);
    const buckets: OrderDayStat[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) buckets.push({ date: d.toISOString().slice(0, 10), count: 0, revenue: 0 });
    return buckets;
  }
}

/** Time-series order created vs completed (via RPC — server-side aggregation) */
export async function getOrderStatusTimeSeries(params?: { startDate?: string; endDate?: string; days?: number }): Promise<OrderStatusDayStat[]> {
  if (!supabase) throw new Error('Supabase client not available');
  try {
    const days = params?.days || 7;
    const end = params?.endDate ? new Date(params.endDate) : new Date();
    const start = params?.startDate ? new Date(params.startDate) : new Date(end.getTime() - (days - 1) * 86400000);
    const startISO = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
    const endISO = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).toISOString();

    const dailyStats: Record<string, { created: number; completed: number }> = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) { dailyStats[d.toISOString().slice(0, 10)] = { created: 0, completed: 0 }; }

    // RPC: agregasi di database
    const { data, error } = await (supabase as any).rpc('get_order_status_time_series', {
      p_start_date: startISO,
      p_end_date: endISO
    });

    if (!error && data) {
      (data as any[]).forEach((row: any) => {
        if (dailyStats[row.date]) {
          dailyStats[row.date].created = Number(row.created_count) || 0;
          dailyStats[row.date].completed = Number(row.completed_count) || 0;
        }
      });
    } else if (error) {
      console.warn('[getOrderStatusTimeSeries] RPC error, fallback:', error.message);
      const { data: orders } = await supabase.from('orders')
        .select('created_at, updated_at, status')
        .gte('created_at', startISO).lt('created_at', endISO)
        .limit(1000);
      (orders || []).forEach(order => {
        const createdKey = new Date(order.created_at).toISOString().slice(0, 10);
        if (dailyStats[createdKey]) dailyStats[createdKey].created += 1;
        if (order.status === 'completed' && order.updated_at) {
          const updatedKey = new Date(order.updated_at).toISOString().slice(0, 10);
          if (dailyStats[updatedKey]) dailyStats[updatedKey].completed += 1;
        }
      });
    }

    return Object.entries(dailyStats).map(([date, s]) => ({ date, ...s })).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error in getOrderStatusTimeSeries:', error);
    const days = params?.days || 7; const end = params?.endDate ? new Date(params.endDate) : new Date();
    const start = params?.startDate ? new Date(params.startDate) : new Date(end.getTime() - (days - 1) * 86400000);
    const buckets: OrderStatusDayStat[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) buckets.push({ date: d.toISOString().slice(0, 10), created: 0, completed: 0 });
    return buckets;
  }
}

/** Top selling products (via RPC — server-side aggregation + join) */
export async function getTopProducts(params?: { startDate?: string; endDate?: string; limit?: number }): Promise<TopProductStat[]> {
  if (!supabase) throw new Error('Supabase client not available');
  try {
    const lim = params?.limit || 5;
    const end = params?.endDate ? new Date(params.endDate) : new Date();
    const start = params?.startDate ? new Date(params.startDate) : new Date(end.getTime() - 6 * 86400000);
    const startISO = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
    const endISO = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString();

    // RPC: agregasi + JOIN product names di database
    const { data, error } = await (supabase as any).rpc('get_top_products', {
      p_start_date: startISO,
      p_end_date: endISO,
      p_limit: lim
    });

    if (!error && data) {
      return (data as any[]).map((row: any) => ({
        product_id: row.product_id,
        product_name: row.product_name || 'Produk',
        count: Number(row.order_count) || 0,
        revenue: Number(row.revenue) || 0,
      }));
    }

    console.warn('[getTopProducts] RPC error, fallback ke query terbatas:', error?.message);
    // Fallback: query minimal dengan limit
    const { data: orders } = await supabase.from('orders')
      .select('product_id, amount, status')
      .gte('created_at', startISO).lte('created_at', endISO)
      .not('product_id', 'is', null)
      .limit(500);

    const agg: Record<string, TopProductStat> = {};
    (orders || []).forEach(order => {
      const pid = order.product_id || 'unknown';
      if (!agg[pid]) agg[pid] = { product_id: pid, product_name: 'Produk', count: 0, revenue: 0 };
      agg[pid].count += 1;
      if (order.status === 'paid' || order.status === 'completed') agg[pid].revenue += Number(order.amount) || 0;
    });

    // Ambil nama produk hanya untuk top products
    const topIds = Object.values(agg).sort((a, b) => b.revenue - a.revenue).slice(0, lim).map(t => t.product_id);
    if (topIds.length > 0) {
      const { data: products } = await supabase.from('products').select('id, name').in('id', topIds);
      (products || []).forEach(p => { if (agg[p.id]) agg[p.id].product_name = p.name; });
    }

    return Object.values(agg).sort((a, b) => b.revenue - a.revenue).slice(0, lim);
  } catch (error) { console.error('Error in getTopProducts:', error); return []; }
}

/**
 * @deprecated Gunakan adminNotificationService sebagai gantinya.
 */
export async function getNotifications(_page: number = 1, _limit: number = 20): Promise<AdminNotification[]> {
  console.warn('[adminService] getNotifications is deprecated. Use adminNotificationService instead.');
  return [];
}
