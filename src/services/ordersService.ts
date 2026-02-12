// Service for orders data access - Uses anonymous key with proper RLS policies
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Order {
  id: string;
  customer_name: string;
  product_name?: string;
  amount: number;
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  created_at: string;
  user_id?: string;
  product_id?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
}

export const ordersService = {
  async getOrders(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}) {
    const { page = 1, limit = 10, search = '', status = '' } = options;
    const offset = (page - 1) * limit;

    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          customer_email,
          customer_phone,
          amount,
          status,
          payment_method,
          created_at,
          product_id,
          user_id
        `);

      // Apply search filter
      if (search) {
        query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
      }

      // Apply status filter
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Get total count for pagination
      const { count: totalCount, error: countError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });

      if (countError) {
        throw countError;
      }

      // Get orders with pagination
      const { data: orders, error } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        orders: orders || [],
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  },

  async getOrderStats() {
    try {
      // RPC: agregasi di database — menghindari download semua baris orders
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (!error && data) {
        return {
          totalOrders: Number(data.total_orders) || 0,
          totalRevenue: Number(data.total_revenue) || 0,
          pendingOrders: Number(data.pending_orders) || 0,
          completedOrders: Number(data.completed_orders) || 0,
        };
      }
      console.warn('[getOrderStats] RPC error, using count fallback:', error?.message);

      // Fallback: head-only count queries (nol transfer data) + RPC revenue
      const [totalResult, pendingResult, completedResult, revenueResult] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.rpc('get_total_revenue'),
      ]);

      return {
        totalOrders: totalResult.count || 0,
        totalRevenue: Number(revenueResult.data) || 0,
        pendingOrders: pendingResult.count || 0,
        completedOrders: completedResult.count || 0,
      };
    } catch (error) {
      console.error('Error fetching order stats:', error);
      throw error;
    }
  },

  async updateOrderStatus(orderId: string, status: Order['status']) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  async deleteOrder(orderId: string) {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  }
};
