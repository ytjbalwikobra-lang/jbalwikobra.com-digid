import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Service role key for admin operations (bypasses RLS)
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlaXRodXZnbGR6eG5nZ3hhZHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ2MzMyMSwiZXhwIjoyMDcyMDM5MzIxfQ.pLPA5-pZ4jpjzhsevyMJoRLmLYbPbESfMbt14PBMXd8';

// Create service client for admin operations
const serviceSupabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'https://xeithuvgldzxnggxadri.supabase.co',
  SERVICE_ROLE_KEY
);

// Regular client for non-admin operations
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'https://xeithuvgldzxnggxadri.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY || ''
);

export interface Order {
  id: string;
  product_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  order_type: 'purchase' | 'rental';
  amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'expired' | 'refunded';
  payment_method: string | null;
  rental_duration: number | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  xendit_invoice_id: string | null;
  xendit_invoice_url: string | null;
  currency: string;
  expires_at: string | null;
  paid_at: string | null;
  payment_channel: string | null;
  payer_email: string | null;
  payer_phone: string | null;
  client_external_id: string | null;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  rental_price?: number;
  description?: string;
  category?: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  total_orders: number;
  total_spent: number;
}

class AdminService {
  private client: SupabaseClient;

  constructor() {
    // Always use service client for admin operations to bypass RLS
    this.client = serviceSupabase;
    console.log('AdminService initialized with service role client');
  }

  async getOrders(page: number = 1, limit: number = 10): Promise<{ orders: Order[], total: number }> {
    try {
      console.log(`Fetching orders - page: ${page}, limit: ${limit}`);
      
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await this.client
        .from('orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      console.log(`Successfully fetched ${data?.length || 0} orders out of ${count || 0} total`);

      return {
        orders: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('AdminService.getOrders error:', error);
      throw error;
    }
  }

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const { data, error } = await this.client
        .from('orders')
        .select('id, product_id, customer_name, customer_email, customer_phone, order_type, amount, status, payment_method, rental_duration, created_at, updated_at, user_id, xendit_invoice_id, xendit_invoice_url, currency, expires_at, paid_at, payment_channel, payer_email, payer_phone, client_external_id')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching order by ID:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('AdminService.getOrderById error:', error);
      throw error;
    }
  }

  async updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
    try {
      const { data, error } = await this.client
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating order status:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('AdminService.updateOrderStatus error:', error);
      throw error;
    }
  }

  async getProducts(page: number = 1, limit: number = 10): Promise<{ products: Product[], total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      const { data, error, count } = await this.client
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      return {
        products: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('AdminService.getProducts error:', error);
      throw error;
    }
  }

  async getCustomers(page: number = 1, limit: number = 10): Promise<{ customers: Customer[], total: number }> {
    try {
      // Get unique customers from orders table since we don't have a dedicated customers table
      const { data: ordersData, error } = await this.client
        .from('orders')
        .select('customer_name, customer_email, customer_phone, amount, created_at')
        .not('customer_name', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customer data:', error);
        throw error;
      }

      // Process and deduplicate customers
      const customerMap = new Map<string, Customer>();
      
      ordersData?.forEach(order => {
        const key = order.customer_email || order.customer_phone;
        if (!key) return;

        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: key,
            name: order.customer_name || 'Unknown',
            email: order.customer_email || '',
            phone: order.customer_phone || '',
            created_at: order.created_at,
            total_orders: 0,
            total_spent: 0
          });
        }

        const customer = customerMap.get(key)!;
        customer.total_orders++;
        customer.total_spent += order.amount || 0;
      });

      const customers = Array.from(customerMap.values());
      const offset = (page - 1) * limit;
      const paginatedCustomers = customers.slice(offset, offset + limit);

      return {
        customers: paginatedCustomers,
        total: customers.length
      };
    } catch (error) {
      console.error('AdminService.getCustomers error:', error);
      throw error;
    }
  }

  async getDashboardStats(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    totalProducts: number;
    recentOrders: Order[];
  }> {
    try {
      // Get all orders for calculations
      const { data: orders, error: ordersError } = await this.client
        .from('orders')
        .select('id, amount, customer_email, created_at')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get products count
      const { count: productsCount, error: productsError } = await this.client
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) throw productsError;

      // Calculate stats
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;
      const uniqueCustomers = new Set(
        orders?.map(order => order.customer_email || order.customer_phone).filter(Boolean)
      ).size;
      const recentOrders = orders?.slice(0, 5) || [];

      return {
        totalOrders,
        totalRevenue,
        totalCustomers: uniqueCustomers,
        totalProducts: productsCount || 0,
        recentOrders
      };
    } catch (error) {
      console.error('AdminService.getDashboardStats error:', error);
      throw error;
    }
  }

  async searchOrders(query: string): Promise<Order[]> {
    try {
      const { data, error } = await this.client
        .from('orders')
        .select('id, product_id, customer_name, customer_email, customer_phone, order_type, amount, status, payment_method, rental_duration, created_at, updated_at, user_id, xendit_invoice_id, xendit_invoice_url, currency, expires_at, paid_at, payment_channel, payer_email, payer_phone, client_external_id')
        .or(`customer_name.ilike.%${query}%,customer_email.ilike.%${query}%,customer_phone.ilike.%${query}%,id.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('AdminService.searchOrders error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const adminService = new AdminService();
