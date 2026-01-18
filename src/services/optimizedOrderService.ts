// Optimized Order Service with pagination
// Uses centralized globalCacheManager for consistent caching across the app
import { supabase } from '../services/supabase';
import { globalCache, cacheUtils } from './globalCacheManager';

interface OrderFilters {
  search?: string;
  status?: string;
  paymentMethod?: string;
  orderType?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Cache tag constants for tag-based invalidation
const CACHE_TAGS = {
  ORDERS: 'opt-orders',
  ORDERS_LIST: 'opt-orders-list',
  ORDERS_STATS: 'opt-orders-stats',
};

class OptimizedOrderService {
  private static getCacheKey(key: string, filters?: any): string {
    return cacheUtils.generateKey(`orders:${key}`, filters || {});
  }

  static async getOrdersPaginated(
    filters: OrderFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20 } = pagination;
    const cacheKey = this.getCacheKey('orders_paginated', { filters, pagination });
    
    return globalCache.getOrSet<PaginatedResponse<any>>(
      cacheKey,
      async () => {
        try {
          if (!supabase) throw new Error('Supabase not configured');

          // Build query with optimized select
          let query = supabase
            .from('orders')
            .select(`
              id, customer_name, customer_email, customer_phone,
              amount, status, payment_method, order_type,
              created_at, updated_at, notes, product_id
            `, { count: 'exact' });

          // Apply filters at database level
          if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
          }

          if (filters.paymentMethod && filters.paymentMethod !== 'all') {
            query = query.eq('payment_method', filters.paymentMethod);
          }

          if (filters.orderType && filters.orderType !== 'all') {
            query = query.eq('order_type', filters.orderType);
          }

          if (filters.search && filters.search.trim()) {
            const searchTerm = filters.search.trim();
            query = query.or(`customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`);
          }

          if (filters.dateFrom) {
            query = query.gte('created_at', filters.dateFrom);
          }

          if (filters.dateTo) {
            query = query.lte('created_at', filters.dateTo);
          }

          if (filters.amountMin !== undefined) {
            query = query.gte('amount', filters.amountMin);
          }

          if (filters.amountMax !== undefined) {
            query = query.lte('amount', filters.amountMax);
          }

          // Apply pagination
          const offset = (page - 1) * limit;
          query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          const { data, error, count } = await query;

          if (error) throw error;

          return {
            data: data || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
          };

        } catch (error) {
          console.error('Error fetching paginated orders:', error);
          return {
            data: [],
            total: 0,
            page,
            limit,
            totalPages: 0
          };
        }
      },
      { ttl: cacheUtils.TTL.SHORT, tags: [CACHE_TAGS.ORDERS, CACHE_TAGS.ORDERS_LIST] }
    );
  }

  static async getOrdersStats(): Promise<{ [key: string]: number }> {
    const cacheKey = 'orders:stats';
    
    return globalCache.getOrSet<{ [key: string]: number }>(
      cacheKey,
      async () => {
        try {
          if (!supabase) return {};

          // Single aggregated query instead of multiple round-trips
          const { data, error } = await supabase.rpc('get_order_stats_optimized');
          
          if (error) {
            console.warn('RPC get_order_stats_optimized not available, falling back to multiple queries');
            
            // Fallback: parallel status queries (still better than sequential)
            const statusQueries = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'].map(status =>
              supabase!
                .from('orders')
                .select('id', { count: 'exact', head: true })
                .eq('status', status)
            );

            const totalQuery = supabase!
              .from('orders')
              .select('id', { count: 'exact', head: true });

            const results = await Promise.all([...statusQueries, totalQuery]);
            
            return {
              pending: results[0].count || 0,
              confirmed: results[1].count || 0,
              processing: results[2].count || 0,
              completed: results[3].count || 0,
              cancelled: results[4].count || 0,
              total: results[5].count || 0
            };
          }

          return data || {};

        } catch (error) {
          console.error('Error fetching order stats:', error);
          return {};
        }
      },
      { ttl: cacheUtils.TTL.SHORT, tags: [CACHE_TAGS.ORDERS_STATS] }
    );
  }

  static clearCache(): void {
    globalCache.invalidateByTags([
      CACHE_TAGS.ORDERS,
      CACHE_TAGS.ORDERS_LIST,
      CACHE_TAGS.ORDERS_STATS
    ]);
  }
}

export { OptimizedOrderService };
export type { OrderFilters, PaginatedResponse };
