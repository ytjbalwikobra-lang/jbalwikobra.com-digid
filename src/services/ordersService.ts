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
      const { data: orders, error } = await supabase
        .from('orders')
        .select('status, amount');

      if (error) {
        throw error;
      }

      const totalOrders = orders?.length || 0;
      // Business rule update: revenue counts only PAID + COMPLETED
      const revenueSourceStatuses = new Set(['paid','completed']);
      const revenueOrders = orders?.filter(o => revenueSourceStatuses.has(o.status)) || [];
      
      const totalRevenue = revenueOrders.reduce((sum, order) => {
        const amount = order.amount || 0;
        return sum + amount;
      }, 0);
      
      const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;
      const completedOrders = orders?.filter(order => order.status === 'completed').length || 0;

      return {
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
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
