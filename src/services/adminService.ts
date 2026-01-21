import { adminCache } from './adminCache';
import { ordersService } from './ordersService';
import { dbRowToDomainProduct } from './mappers/productMapper';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabaseAdmin';

// Development mode detection
const isDev = process.env.NODE_ENV === 'development';

/**
 * Retry helper for admin API calls with exponential backoff
 * Handles 401 errors that may occur due to race conditions after login
 * In development mode, allows requests without session token (API handles dev auth)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
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
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      'Content-Type': 'application/json'
    };
    
    // Add auth header if token exists
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    try {
      const response = await fetch(url, { ...options, headers });
      
      // If 401 and we have retries left (and not in dev mode), wait and retry
      if (response.status === 401 && !isDev && attempt < maxRetries - 1) {
        console.warn(`[adminService] 401 received, retrying in ${baseDelay * Math.pow(2, attempt)}ms (attempt ${attempt + 1}/${maxRetries})`);
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

// Use the shared authenticated Supabase client
// This ensures RLS policies work correctly with the user's session
try {
  if (supabase) {
  } else {
    console.warn('AdminService: Supabase not configured — running with dev fallbacks');
  }
} catch {}

// Helper functions for fetching related data
interface ProductNameData {
  id: string;
  name: string;
}

interface UserNameData {
  id: string;
  name: string;
}

async function fetchProductNames(productIds: string[]): Promise<Record<string, string>> {
  if (!supabase || productIds.length === 0) return {};
  
  try {
    const { data: prodData, error } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);
    
    if (error) {
      console.warn('[fetchProductNames] Failed to fetch product names:', error);
      return {};
    }
    
    return (prodData as ProductNameData[] || []).reduce((acc: Record<string, string>, p: ProductNameData) => {
      acc[p.id] = p.name;
      return acc;
    }, {});
  } catch (error) {
    console.warn('[fetchProductNames] Error fetching product names:', error);
    return {};
  }
}

async function fetchUserNames(userIds: string[]): Promise<Record<string, string>> {
  if (!supabase || userIds.length === 0) return {};
  
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);
    
    if (error) {
      console.warn('[fetchUserNames] Failed to fetch user names:', error);
      return {};
    }
    
    return (userData as UserNameData[] || []).reduce((acc: Record<string, string>, u: UserNameData) => {
      acc[u.id] = u.name;
      return acc;
    }, {});
  } catch (error) {
    console.warn('[fetchUserNames] Error fetching user names:', error);
    return {};
  }
}

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  totalReviews: number;
  averageRating: number;
  pendingOrders: number;
  completedOrders: number;
  totalFlashSales: number;
  activeFlashSales: number;
}

export interface Order {
  id: string;
  customer_name: string;
  product_name?: string; // Derived from product_id lookup
  amount: number;
  // Expanded status union to align with broader system usage (paid & processing etc.)
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  order_type: string; // 'purchase' etc.
  rental_duration?: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
  product_id?: string; // Actual column in DB
  customer_email?: string; // Actual column in DB
  customer_phone?: string; // Actual column in DB
  payment_method?: string;
  xendit_invoice_id?: string;
  // Payment information from payments table
  payment_data?: {
    xendit_id?: string;
    payment_method_type?: string; // 'qris', 'bni', 'mandiri', etc.
    payment_status?: string; // 'ACTIVE', 'PENDING', 'PAID', etc.
    qr_url?: string;
    qr_string?: string;
    account_number?: string;
    bank_code?: string;
    payment_url?: string;
    payment_code?: string;
    retail_outlet?: string;
    created_at?: string;
    expiry_date?: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  is_admin?: boolean;
  last_login?: string; // For backward compatibility
  last_login_at?: string; // Actual column name in database
  is_active?: boolean;
  phone_verified?: boolean;
  profile_completed?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category_id?: string; // migrated FK
  categoryData?: { id: string; name: string; slug?: string }; // optional joined data
  game_title?: string;
  account_level?: string;
  account_details?: string;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  image?: string;
  images?: string[];
  tier?: string;
  tier_id?: string;
  game_title_id?: string;
  is_flash_sale?: boolean;
  flash_sale_end_time?: string;
  has_rental?: boolean;
  archived_at?: string;
}

export interface Review {
  id?: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at?: string;
  product_name?: string;
  user_name?: string;
  is_verified?: boolean;
  helpful_count?: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  cta_text?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashSale {
  id: string;
  product_id: string;
  sale_price: number;
  original_price: number;
  start_time: string;
  end_time: string;
  stock: number;
  is_active: boolean;
  created_at: string;
  product?: Product;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  totalPages: number;
}

export interface FeedPost {
  id: string;
  user_id: string;
  type: 'post' | 'announcement';
  product_id?: string | null;
  title?: string | null;
  content: string;
  rating?: number | null;
  image_url?: string | null;
  likes_count: number;
  comments_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  // Optional computed fields
  author_name?: string;
  views?: number;
}

export interface AdminNotification {
  id: string;
  type: 'new_order' | 'paid_order' | 'cancelled_order' | 'new_user' | 'new_review';
  title: string;
  message: string;
  order_id?: string;
  user_id?: string;
  product_name?: string;
  amount?: number;
  created_at: string;
  is_read: boolean;
}

// Dashboard analytics helper types
export interface OrderDayStat {
  date: string; // YYYY-MM-DD
  count: number;
  revenue: number;
}

export interface OrderStatusDayStat {
  date: string; // YYYY-MM-DD
  created: number;
  completed: number;
}

export interface TopProductStat {
  product_id: string | null;
  product_name: string;
  count: number;
  revenue: number;
}

// Simple in-memory cache for admin data
const adminDataCache = {
  orders: null as { data: Order[]; count: number; timestamp: number } | null,
  users: null as { data: User[]; count: number; timestamp: number } | null,
  CACHE_DURATION: 60 * 1000, // 1 minute

  isValid(cache: { timestamp: number } | null): boolean {
    if (!cache) return false;
    return Date.now() - cache.timestamp < this.CACHE_DURATION;
  },

  clearOrders() {
    this.orders = null;
  },

  clearUsers() {
    this.users = null;
  },

  clearAll() {
    this.orders = null;
    this.users = null;
  }
};


export interface AdminStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  lastUpdated?: string;
}

export interface OrderItem {
  id: string;
  user_email: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface UserItem {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export const adminService = {
  // Inline product update methods (previously in AdminService class)
  async updateProductFields(id: string, fields: Partial<Pick<Product,'price'|'stock'|'is_active'>>): Promise<Product | null> {
    try {
      console.error('🚨 [adminService.updateProductFields] STARTING UPDATE:', { id, fields });
      
      // Try to use the admin API first (has service role access)
      try {
        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
          },
          body: JSON.stringify({
            action: 'updateProduct',
            id,
            fields: { ...fields, updated_at: new Date().toISOString() }
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.error('🚨 [adminService.updateProductFields] API RESPONSE:', result);
          if (result.success && result.data) {
            console.error('🚨 [adminService.updateProductFields] ✅ UPDATED VIA API:', result.data);
            adminCache.invalidatePattern('admin:products');
            return result.data as Product;
          } else {
            console.error('🚨 [adminService.updateProductFields] API returned non-success:', result);
          }
        } else {
          const errorText = await response.text();
          console.warn('[adminService.updateProductFields] API HTTP error:', response.status, errorText);
        }
      } catch (apiError) {
        console.warn('[adminService.updateProductFields] API call failed:', apiError);
      }

      // Fallback to direct Supabase update
      const client = supabaseAdmin || supabase;
      
      if (!client) {
        throw new Error('Supabase client not available');
      }
      
      const updatePayload: any = { ...fields, updated_at: new Date().toISOString() };
      const { data, error } = await client
        .from('products')
        .update(updatePayload)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('[adminService.updateProductFields] Supabase error:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.error('[adminService.updateProductFields] ❌ UPDATE BLOCKED - Empty response');
        return null;
      }
      
      // Verify the update
      const updatedProduct = data[0];
      
      if (fields.price !== undefined && updatedProduct.price !== fields.price) {
        console.error('[adminService.updateProductFields] ❌ Price mismatch! Expected:', fields.price, 'Got:', updatedProduct.price);
        return null;
      }
      if (fields.stock !== undefined && updatedProduct.stock !== fields.stock) {
        console.error('[adminService.updateProductFields] ❌ Stock mismatch! Expected:', fields.stock, 'Got:', updatedProduct.stock);
        return null;
      }
      if (fields.is_active !== undefined && updatedProduct.is_active !== fields.is_active) {
        console.error('[adminService.updateProductFields] ❌ Status mismatch! Expected:', fields.is_active, 'Got:', updatedProduct.is_active);
        return null;
      }
      adminCache.invalidatePattern('admin:products');
      return updatedProduct as Product;
    } catch (e) {
      console.error('[adminService.updateProductFields] Caught error:', e);
      return null;
    }
  },

  async toggleProductActive(id: string, current: boolean): Promise<boolean> {
    const res = await adminService.updateProductFields(id, { is_active: !current });
    return !!res;
  },

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const response = await fetch('/api/admin', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'archive_product',
          productId: id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to archive product');
      }
      
      return true;
    } catch (e: any) {
      console.error('[adminService.deleteProduct] error', e);
      throw e;
    }
  },

  async completeOrder(orderId: string): Promise<boolean> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      const { error } = await supabase.from('orders').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', orderId);
      if (error) throw error;
      return true;
    } catch(e) {
      console.error('completeOrder error', e);
      return false;
    }
  },

  async getAdminStats(): Promise<AdminStats> {
    
    // In development without Supabase, return safe fallback to avoid crashing the Admin UI
    if (!supabase) {
      console.warn('⚠️ [adminService.getAdminStats] Supabase not configured, returning fallback');
      return {
        totalOrders: 0,
        totalRevenue: 0,
        totalUsers: 0,
        totalProducts: 0,
        totalReviews: 0,
        averageRating: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalFlashSales: 0,
        activeFlashSales: 0
      };
    }

    return adminCache.getOrFetch('admin:stats', async () => {
      try {
        
        // Get all stats in parallel - optimized queries
        const [
          { count: totalUsers },
          { count: totalProducts },
          { count: totalOrders },
          { count: pendingOrders },
          { count: completedOrders },
          { count: paidOrders },
          ordersWithRevenue
        ] = await Promise.all([
          (supabase as any).from('users').select('id', { count: 'exact', head: true }),
          (supabase as any).from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
          (supabase as any).from('orders').select('id', { count: 'exact', head: true }),
          (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
          (supabase as any).from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
          (supabase as any).from('orders').select('amount, status').in('status', ['paid', 'completed'])
        ]);

        // Calculate total revenue from paid and completed orders
        let totalRevenue = 0;
        if (ordersWithRevenue.data) {
          totalRevenue = ordersWithRevenue.data.reduce((sum, order) => 
            sum + (Number(order.amount) || 0), 0);
        }

        // Try to get reviews (might not exist)
        let totalReviews = 0;
        let averageRating = 0;
        
        try {
          const [
            { count: reviewCount },
            reviewsWithRating
          ] = await Promise.all([
            (supabase as any).from('reviews').select('id', { count: 'exact', head: true }),
            (supabase as any).from('reviews').select('rating')
          ]);
          
          totalReviews = reviewCount || 0;
          averageRating = reviewsWithRating.data?.length > 0
            ? reviewsWithRating.data.reduce((sum, review) => sum + review.rating, 0) / reviewsWithRating.data.length
            : 0;
        } catch (reviewError) {
          // Silent fallback if reviews table missing - this is expected for new installations
          console.info('ℹ️ [adminService.getAdminStats] Reviews table not found (expected for new installations)');
        }

        // Get flash sales data
        let totalFlashSales = 0;
        let activeFlashSales = 0;
        try {
          const [
            { count: totalFlashSalesCount },
            { count: activeFlashSalesCount }
          ] = await Promise.all([
            (supabase as any).from('flash_sales').select('id', { count: 'exact', head: true }),
            (supabase as any).from('flash_sales').select('id', { count: 'exact', head: true }).eq('is_active', true)
          ]);
          
          totalFlashSales = totalFlashSalesCount || 0;
          activeFlashSales = activeFlashSalesCount || 0;
        } catch (flashSalesError) {
          // Silent fallback if flash_sales table missing - this is expected for new installations
          console.info('ℹ️ [adminService.getAdminStats] Flash sales table not found (expected for new installations)');
        }

        const stats = {
          totalOrders: totalOrders || 0,
          totalRevenue,
          totalUsers: totalUsers || 0,
          totalProducts: totalProducts || 0,
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          pendingOrders: pendingOrders || 0,
          completedOrders: (completedOrders || 0) + (paidOrders || 0), // Count both paid and completed orders
          totalFlashSales,
          activeFlashSales
        };
        
                
        return stats;
      } catch (error) {
        console.error('❌ [adminService.getAdminStats] Error fetching dashboard stats:', error);
        console.error('❌ [adminService.getAdminStats] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        
        return {
          totalOrders: 0,
          totalRevenue: 0,
          totalUsers: 0,
          totalProducts: 0,
          totalReviews: 0,
          averageRating: 0,
          pendingOrders: 0,
          completedOrders: 0,
          totalFlashSales: 0,
          activeFlashSales: 0
        };
      }
    });
  },

  // Clear admin stats cache to force fresh data
  clearStatsCache(): void {
    adminCache.invalidate('admin:stats');
  },

  // Clear orders cache to force fresh data
  clearOrdersCache(): void {
    // Clear all orders cache entries (all pages, limits, and filters)
    adminCache.invalidatePattern('admin:orders:');
  },

  // Clear users cache to force fresh data
  clearUsersCache(): void {
    adminCache.invalidatePattern('admin:users:');
  },

  async getOrders(page: number = 1, limit: number = 10, statusFilter?: string): Promise<PaginatedResponse<Order>> {
    return adminCache.getOrFetch(`admin:orders:${page}:${limit}:${statusFilter || 'all'}`, async () => {
      // Prefer serverless admin API (service role) to bypass RLS issues in browser
      try {
        const params = new URLSearchParams({
          action: 'orders',
          page: String(page),
          limit: String(limit)
        });
        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

        const sessionToken = localStorage.getItem('session_token');
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        
        const resp = await fetch(`/api/admin?${params.toString()}`, {
          method: 'GET',
          headers
        });

        if (resp.ok) {
          const payload = await resp.json();
          // API returns { success: true, data: [...], count: 1387, page: 1 }
          const rows = payload.data || [];
          const total = payload.count ?? rows.length;

          return {
            data: rows as Order[],
            count: total,
            page,
            totalPages: Math.ceil((total || 0) / limit)
          };
        }
        console.warn('[adminService.getOrders - CACHED] API fallback failed with status', resp.status);
      } catch (apiErr) {
        console.warn('[adminService.getOrders - CACHED] API fetch failed, falling back to direct supabase:', apiErr);
      }

      if (!supabase) {
        console.error('[adminService.getOrders - CACHED] Supabase client not available');
        throw new Error('Supabase client not available');
      }

      let query = supabase
        .from('orders')
        .select('id, product_id, customer_name, customer_email, customer_phone, order_type, rental_duration, amount, status, payment_method, user_id, created_at, updated_at, client_external_id', { count: 'exact' });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data: orders, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        console.error('[adminService.getOrders] query error:', error);
        throw error;
      }

      const rows = orders || [];

      // Get payment data for these orders
      const externalIds = rows.map(order => order.client_external_id).filter(Boolean);
      let paymentsMap: { [key: string]: any } = {};
      
      if (externalIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select('external_id, xendit_id, payment_method, status, payment_data, created_at, expiry_date')
          .in('external_id', externalIds);
        
        if (payments) {
          payments.forEach(payment => {
            paymentsMap[payment.external_id] = payment;
          });
        }
      }

      // Normalize fallback for missing customer_name/product_id
      const normalizeOrder = (o: any) => {
        return {
          id: o.id,
          customer_name: o.customer_name || o.customer || o.client_name || 'Unknown Customer',
          product_name: o.product_id ? productsMap[o.product_id] : undefined,
          amount: Number(o.amount) || 0,
          status: (o.status || 'pending').toLowerCase(),
          order_type: o.order_type || 'purchase',
          rental_duration: o.rental_duration ?? null,
          created_at: o.created_at,
          updated_at: o.updated_at,
          user_id: o.user_id,
          product_id: o.product_id,
          customer_email: o.customer_email,
          customer_phone: o.customer_phone,
          payment_method: o.payment_method,
          xendit_invoice_id: o.xendit_invoice_id,
          // Payment information from payments table
          payment_data: (() => {
            const paymentRecord = paymentsMap[o.client_external_id];
            if (!paymentRecord) return undefined;
            return {
              xendit_id: paymentRecord.xendit_id,
              payment_method_type: paymentRecord.payment_method,
              payment_status: paymentRecord.status,
              qr_url: paymentRecord.payment_data?.qr_url,
              qr_string: paymentRecord.payment_data?.qr_string,
              account_number: paymentRecord.payment_data?.account_number,
              bank_code: paymentRecord.payment_data?.bank_code,
              payment_url: paymentRecord.payment_data?.payment_url,
              payment_code: paymentRecord.payment_data?.payment_code,
              retail_outlet: paymentRecord.payment_data?.retail_outlet,
            };
          })()
        };
      };

      // Get product names
      const productIds = Array.from(new Set(rows.map((o: any) => o.product_id).filter(Boolean)));
      const productsMap = await fetchProductNames(productIds);

      // Map to Order interface with payment data
      const mapped: Order[] = rows.map(normalizeOrder);

      return {
        data: mapped,
        count: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    });
  },

  async getUsers(page: number = 1, limit: number = 10, searchTerm?: string): Promise<PaginatedResponse<User>> {
    return adminCache.getOrFetch(`admin:users:${page}:${limit}:${searchTerm || ''}`, async () => {
      // Prefer serverless admin API (service role) to bypass RLS issues in browser
      try {
        const params = new URLSearchParams({
          action: 'users',
          page: String(page),
          limit: String(limit)
        });
        if (searchTerm) params.set('search', searchTerm);

        const sessionToken = localStorage.getItem('session_token');
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (sessionToken) {
          headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        
        const resp = await fetch(`/api/admin?${params.toString()}`, {
          method: 'GET',
          headers
        });

        if (resp.ok) {
          const payload = await resp.json();
          const rows = payload.data || [];
          const total = payload.count ?? rows.length;

          // Normalize fields to UI expectations
          const normalized = rows.map((u: any) => ({
            id: u.id,
            email: u.email || u.user_email || '',
            name: u.name || u.full_name || u.username || u.email || 'Unknown',
            avatar_url: u.avatar_url || u.avatar,
            phone: u.phone || u.phone_number,
            created_at: u.created_at,
            is_admin: u.is_admin ?? (u.role === 'admin'),
            last_login: u.last_login || u.last_sign_in_at || u.updated_at
          }));

          return {
            data: normalized,
            count: total,
            page,
            totalPages: Math.ceil((total || 0) / limit)
          };
        }
        // API fallback failed silently, try Supabase direct
      } catch {
        // API fetch failed, falling back to direct supabase
      }

      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      let query = supabase
        .from('users')
        .select('id, email, name, phone, created_at, is_admin, last_login_at, is_active, phone_verified, profile_completed', { count: 'exact' });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        throw error;
      }
      
      let usersData = data || [];
      let usersCount = count || 0;

      // Fallback: if no rows returned, try profiles table (common Supabase schema)
      if (usersData.length === 0) {
        const { data: profiles, error: profilesError, count: profilesCount } = await supabase
          .from('profiles')
          .select('id, email, name, phone, created_at, is_admin, last_login_at, is_active, phone_verified, profile_completed', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (!profilesError && profiles) {
          usersData = profiles;
          usersCount = profilesCount || profiles.length;
        }
      }

      // Normalize fields to UI expectations
      const normalized = usersData.map((u: any) => ({
        id: u.id,
        email: u.email || u.user_email || '',
        name: u.name || u.full_name || u.username || u.email || 'Unknown',
        avatar_url: u.avatar_url || u.avatar,
        phone: u.phone || u.phone_number,
        created_at: u.created_at,
        is_admin: u.is_admin ?? (u.role === 'admin'),
        last_login: u.last_login || u.last_sign_in_at || u.updated_at
      }));

      return {
        data: normalized,
        count: usersCount,
        page,
        totalPages: Math.ceil((usersCount) / limit)
      };
    });
  },

  async getProducts(page: number = 1, limit: number = 10, searchTerm?: string, sort?: { column: string; direction: 'asc'|'desc' }): Promise<PaginatedResponse<Product>> {
    const sortKey = sort ? `${sort.column}:${sort.direction}` : 'created_at:desc';
    return adminCache.getOrFetch(`admin:products:${page}:${limit}:${searchTerm || ''}:${sortKey}`, async () => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      // Use LEFT JOIN with tiers and game_titles, get category data separately
      // Filter out archived products by default for admin panel
      let query = supabase
        .from('products')
        .select(`
          id, name, description, price, original_price, tier_id, game_title_id, category_id,
          stock, is_active, image, images, created_at, updated_at, archived_at, sold_channel,
          is_flash_sale, flash_sale_end_time, has_rental,
          tiers (
            id, name, slug, color, background_gradient, icon
          ),
          game_titles (
            id, name, slug, icon, logo_url
          ),
          rental_options (
            id, duration, price, description
          )
        `, { count: 'exact' })
        .is('archived_at', null); // Only show non-archived products in admin panel

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const orderColumn = sort?.column || 'created_at';
      const ascending = sort ? sort.direction === 'asc' : false;
      const { data, error, count } = await query
        .order(orderColumn, { ascending })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        console.error('[adminService.getProducts] query error:', error);
        throw error;
      }

      const rows = data || [];

      // Fetch category data separately for products that have category_id
      const categoryIds = [...new Set(rows.filter(r => r.category_id).map(r => r.category_id))];
      let categoriesMap = new Map();
      
      if (categoryIds.length > 0) {
        try {
          const { data: categories } = await supabase
            .from('categories')
            .select('id, name, slug, icon')
            .in('id', categoryIds);
          
          if (categories) {
            categories.forEach(cat => categoriesMap.set(cat.id, cat));
          }
        } catch (err) {
          console.warn('[adminService.getProducts] failed to fetch categories:', err);
        }
      }

      const mapped = rows.map((row: any) => {
        const base: any = dbRowToDomainProduct(row);
        // expose category_id as categoryId for edit modal compatibility
        if ((row as any).category_id) base.categoryId = (row as any).category_id;
        // Add category data if available
        if ((row as any).category_id && categoriesMap.has((row as any).category_id)) {
          base.categoryData = categoriesMap.get((row as any).category_id);
        }
        return base as Product;
      });

      return {
        data: mapped,
        count: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    });
  },

  async getProductStats(): Promise<{ 
    total: number; 
    active: number; 
    soldViaWeb: number; 
    soldViaWA: number; 
    totalValue: number;
    activeValue: number;
  }> {
    return adminCache.getOrFetch('admin:product-stats', async () => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      try {
        // Get all products to calculate accurate statistics
        const { data: allProducts, error } = await supabase
          .from('products')
          .select('price, is_active, archived_at, sold_channel');

        if (error) throw error;

        const products = allProducts || [];
        const total = products.length;
        const active = products.filter(p => p.is_active && !p.sold_channel).length;
        const soldViaWeb = products.filter(p => p.sold_channel === 'web').length;
        const soldViaWA = products.filter(p => p.sold_channel === 'wa').length;
        const totalValue = products.reduce((sum, p) => sum + (p.price || 0), 0);
        const activeValue = products
          .filter(p => p.is_active && !p.sold_channel)
          .reduce((sum, p) => sum + (p.price || 0), 0);

        return { total, active, soldViaWeb, soldViaWA, totalValue, activeValue };
      } catch (error) {
        console.error('[adminService.getProductStats] error:', error);
        return { total: 0, active: 0, soldViaWeb: 0, soldViaWA: 0, totalValue: 0, activeValue: 0 };
      }
    }, { ttl: 300000 }); // Cache for 5 minutes
  },  async getReviews(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Review>> {
    return adminCache.getOrFetch(`admin:reviews:${page}:${limit}`, async () => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      try {
        const { data, error, count } = await supabase
          .from('reviews')
          .select('id, product_id, user_id, rating, comment, created_at, updated_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (error) throw error;
        
        // Get product names
        const productIds = Array.from(new Set((data || []).map((r: any) => r.product_id).filter(Boolean)));
        const productsMap = await fetchProductNames(productIds);

        // Get user names
        const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
        const usersMap = await fetchUserNames(userIds);

        const mapped: Review[] = (data || []).map((r: any) => ({
          id: r.id,
            product_id: r.product_id,
            user_id: r.user_id,
            rating: r.rating,
            comment: r.comment,
            created_at: r.created_at,
            product_name: r.product_id ? productsMap[r.product_id] : undefined,
            user_name: r.user_id ? usersMap[r.user_id] : undefined
        }));

        return {
          data: mapped,
          count: count || 0,
          page,
          totalPages: Math.ceil((count || 0) / limit)
        };
      } catch (error) {
        return {
          data: [],
          count: 0,
          page,
          totalPages: 0
        };
      }
    });
  },

  async getFlashSales(page: number = 1, limit: number = 10): Promise<PaginatedResponse<FlashSale>> {
    return adminCache.getOrFetch(`admin:flash-sales:${page}:${limit}`, async () => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      const { data, error, count } = await supabase
        .from('flash_sales')
        .select(`
          *,
          products(name, price, image)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      
      return {
        data: data || [],
        count: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    });
  },

  async createFlashSale(flashSaleData: {
    product_id: string;
    original_price: number;
    sale_price: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
    stock?: number;
  }): Promise<FlashSale> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data, error } = await supabase
      .from('flash_sales')
      .insert([{
        product_id: flashSaleData.product_id,
        original_price: flashSaleData.original_price,
        sale_price: flashSaleData.sale_price,
        start_time: flashSaleData.start_time,
        end_time: flashSaleData.end_time,
        is_active: flashSaleData.is_active,
        stock: flashSaleData.stock || 10,
        created_at: new Date().toISOString()
      }])
      .select(`
        *,
        products(name, price, image)
      `)
      .single();

    if (error) throw error;
    
    // Clear cache after creating
    adminCache.clear();
    
    return data;
  },

  async updateFlashSale(id: string, updates: {
    product_id?: string;
    original_price?: number;
    sale_price?: number;
    start_time?: string;
    end_time?: string;
    is_active?: boolean;
    stock?: number;
  }): Promise<FlashSale> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data, error } = await supabase
      .from('flash_sales')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        products(name, price, image)
      `)
      .single();

    if (error) throw error;
    
    // Clear cache after updating
    adminCache.clear();
    
    return data;
  },

  async deleteFlashSale(id: string): Promise<boolean> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { error } = await supabase
      .from('flash_sales')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Invalidate flash sale cache
    adminCache.invalidatePattern('admin:flash-sale');
    adminCache.invalidatePattern('admin:flash-sales');
    
    return true;
  },

  async getFlashSaleStats(): Promise<{
    total: number;
    active: number;
    ongoing: number;
    upcoming: number;
    expired: number;
  }> {
    return adminCache.getOrFetch('admin:flash-sale-stats', async () => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('flash_sales')
          .select('id, is_active, start_time, end_time');

        if (error) throw error;

        const sales = data || [];
        const total = sales.length;
        const active = sales.filter(s => s.is_active).length;
        const ongoing = sales.filter(s => {
          const start = new Date(s.start_time);
          const end = new Date(s.end_time);
          const current = new Date(now);
          return s.is_active && current >= start && current <= end;
        }).length;
        const upcoming = sales.filter(s => {
          const start = new Date(s.start_time);
          const current = new Date(now);
          return s.is_active && current < start;
        }).length;
        const expired = sales.filter(s => {
          const end = new Date(s.end_time);
          const current = new Date(now);
          return current > end;
        }).length;

        return { total, active, ongoing, upcoming, expired };
      } catch (error) {
        console.error('[adminService.getFlashSaleStats] error:', error);
        return { total: 0, active: 0, ongoing: 0, upcoming: 0, expired: 0 };
      }
    }, { ttl: 60000 }); // Cache for 1 minute
  },

  async getBanners(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Banner>> {
    return adminCache.getOrFetch(`admin:banners:${page}:${limit}`, async () => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      const { data, error, count } = await supabase
        .from('banners')
        .select('id, title, subtitle, image_url, link_url, cta_text, sort_order, is_active, created_at, updated_at', { count: 'exact' })
        .order('sort_order', { ascending: true })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      
      return {
        data: data || [],
        count: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    });
  },

  async createBanner(banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'>): Promise<Banner> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data, error } = await supabase
      .from('banners')
      .insert([banner])
      .select()
      .single();

    if (error) throw error;
    
    // Invalidate banner cache
    adminCache.invalidatePattern('admin:banner');
    
    return data;
  },

  async updateBanner(id: string, updates: Partial<Omit<Banner, 'id' | 'created_at' | 'updated_at'>>): Promise<Banner> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data, error } = await supabase
      .from('banners')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Invalidate banner cache
    adminCache.invalidatePattern('admin:banner');
    
    return data;
  },

  async deleteBanner(id: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Invalidate banner cache
    adminCache.invalidatePattern('admin:banner');
  },

  async getBannerStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    return adminCache.getOrFetch('admin:banner-stats', async () => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('id, is_active');

        if (error) throw error;

        const banners = data || [];
        const total = banners.length;
        const active = banners.filter(b => b.is_active).length;
        const inactive = banners.filter(b => !b.is_active).length;

        return { total, active, inactive };
      } catch (error) {
        console.error('[adminService.getBannerStats] error:', error);
        return { total: 0, active: 0, inactive: 0 };
      }
    }, { ttl: 60000 }); // Cache for 1 minute
  },

  async toggleBannerStatus(id: string): Promise<Banner> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    // First get current status
    const { data: currentBanner, error: fetchError } = await supabase
      .from('banners')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Toggle status
    const { data, error } = await supabase
      .from('banners')
      .update({ 
        is_active: !currentBanner.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Clear cache
    adminCache.clear();
    
    return data;
  },

  async reorderBanners(bannerIds: string[]): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    // Update sort_order for each banner
    const updates = bannerIds.map((id, index) => ({
      id,
      sort_order: index + 1,
      updated_at: new Date().toISOString()
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('banners')
        .update({ sort_order: update.sort_order, updated_at: update.updated_at })
        .eq('id', update.id);

      if (error) throw error;
    }
    
    // Clear cache
    adminCache.clear();
  },

  async getFeedPosts(page: number = 1, limit: number = 10): Promise<PaginatedResponse<FeedPost>> {
    return adminCache.getOrFetch(`admin:feed-posts:${page}:${limit}`, async () => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      const { data, error, count } = await supabase
        .from('feed_posts')
        .select(`
          *,
          users:user_id (
            name
          )
        `, { count: 'exact' })
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;
      
      // Add computed author_name field
      const postsWithAuthor = (data || []).map(post => ({
        ...post,
        author_name: post.users?.name || 'Unknown User'
      }));
      
      return {
        data: postsWithAuthor,
        count: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      };
    });
  },

  async deleteFeedPost(postId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { error } = await supabase
      .from('feed_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
    
    // Clear cache for feed posts
    adminCache.clear();
  },

  // ----- Dashboard Analytics -----
  async getOrdersTimeSeries(params?: { startDate?: string; endDate?: string; days?: number }): Promise<OrderDayStat[]> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    try {
      const days = params?.days || 7;
      const end = params?.endDate ? new Date(params.endDate) : new Date();
      const start = params?.startDate ? new Date(params.startDate) : new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      const startISO = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
      const endISO = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString();

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, amount, status')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (error) {
        console.warn('getOrdersTimeSeries error', error);
        // Return empty buckets on error
        const buckets: OrderDayStat[] = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0, 10);
          buckets.push({ date: key, count: 0, revenue: 0 });
        }
        return buckets;
      }

      // Group by date
      const dailyStats: Record<string, { count: number; revenue: number }> = {};
      
      // Initialize all days with zero values
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        dailyStats[key] = { count: 0, revenue: 0 };
      }

      // Process orders - only count paid and completed for revenue
      (orders || []).forEach(order => {
        const orderDate = new Date(order.created_at);
        const dateKey = orderDate.toISOString().slice(0, 10);
        
        if (dailyStats[dateKey]) {
          dailyStats[dateKey].count += 1;
          
          // Only include revenue for paid and completed orders
          if (order.status === 'paid' || order.status === 'completed') {
            dailyStats[dateKey].revenue += Number(order.amount) || 0;
          }
        }
      });

      return Object.entries(dailyStats)
        .map(([date, stats]) => ({
          date,
          count: stats.count,
          revenue: stats.revenue
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error in getOrdersTimeSeries:', error);
      // Return empty buckets on error
      const days = params?.days || 7;
      const end = params?.endDate ? new Date(params.endDate) : new Date();
      const start = params?.startDate ? new Date(params.startDate) : new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      
      const buckets: OrderDayStat[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        buckets.push({ date: key, count: 0, revenue: 0 });
      }
      return buckets;
    }
  },

  // Get order created vs completed analytics
  async getOrderStatusTimeSeries(params?: { startDate?: string; endDate?: string; days?: number }): Promise<OrderStatusDayStat[]> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    try {
      const days = params?.days || 7;
      const end = params?.endDate ? new Date(params.endDate) : new Date();
      const start = params?.startDate ? new Date(params.startDate) : new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      
      const startISO = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
      const endISO = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).toISOString();

      // Get all orders within date range
      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, updated_at, status')
        .gte('created_at', startISO)
        .lt('created_at', endISO);

      if (error) {
        console.warn('getOrderStatusTimeSeries error', error);
        // Return empty buckets on error
        const buckets: OrderStatusDayStat[] = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().slice(0, 10);
          buckets.push({ date: key, created: 0, completed: 0 });
        }
        return buckets;
      }

      // Group by date
      const dailyStats: Record<string, { created: number; completed: number }> = {};
      
      // Initialize all days with zero values
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        dailyStats[key] = { created: 0, completed: 0 };
      }

      // Process orders
      (orders || []).forEach(order => {
        const createdDate = new Date(order.created_at);
        const createdDateKey = createdDate.toISOString().slice(0, 10);
        
        // Count all orders as "created" on their creation date
        if (dailyStats[createdDateKey]) {
          dailyStats[createdDateKey].created += 1;
        }
        
        // Count completed orders on their completion date (if completed)
        if (order.status === 'completed' && order.updated_at) {
          const updatedDate = new Date(order.updated_at);
          const updatedDateKey = updatedDate.toISOString().slice(0, 10);
          
          if (dailyStats[updatedDateKey]) {
            dailyStats[updatedDateKey].completed += 1;
          }
        }
      });

      return Object.entries(dailyStats)
        .map(([date, stats]) => ({
          date,
          created: stats.created,
          completed: stats.completed
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error in getOrderStatusTimeSeries:', error);
      // Return empty buckets on error
      const days = params?.days || 7;
      const end = params?.endDate ? new Date(params.endDate) : new Date();
      const start = params?.startDate ? new Date(params.startDate) : new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      
      const buckets: OrderStatusDayStat[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        buckets.push({ date: key, created: 0, completed: 0 });
      }
      return buckets;
    }
  },

  async getTopProducts(params?: { startDate?: string; endDate?: string; limit?: number }): Promise<TopProductStat[]> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    try {
      const limit = params?.limit || 5;
      const end = params?.endDate ? new Date(params.endDate) : new Date();
      const start = params?.startDate ? new Date(params.startDate) : new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
      const startISO = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString();
      const endISO = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).toISOString();

      const { data, error } = await supabase
        .from('orders')
        .select('product_id, amount, status')
        .gte('created_at', startISO)
        .lte('created_at', endISO);

      if (error) {
        console.warn('getTopProducts error', error);
        return [];
      }

      // First get product names for the found product IDs
      const productIds = [...new Set((data || []).map(o => o.product_id).filter(Boolean))];
      const productNamesMap: Record<string, string> = {};
      
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds);
        
        (products || []).forEach(p => {
          productNamesMap[p.id] = p.name;
        });
      }

      const agg: Record<string, TopProductStat> = {};
      (data || []).forEach(order => {
        const pid = order.product_id || 'unknown';
        const name = productNamesMap[pid] || 'produk akun game';
        if (!agg[pid]) {
          agg[pid] = { product_id: pid, product_name: name, count: 0, revenue: 0 };
        }
        agg[pid].count += 1;
        
        // Only include revenue for paid and completed orders
        if (order.status === 'paid' || order.status === 'completed') {
          agg[pid].revenue += Number(order.amount) || 0;
        }
      });

      return Object.values(agg)
        .sort((a, b) => b.revenue - a.revenue) // Sort by revenue instead of count
        .slice(0, limit);
    } catch (error) {
      console.error('Error in getTopProducts:', error);
      return [];
    }
  },

  async getNotifications(page: number = 1, limit: number = 20): Promise<AdminNotification[]> {
    return adminCache.getOrFetch(`admin:notifications:${page}:${limit}`, async () => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
      try {
        const { data, error } = await supabase
          .from('admin_notifications')
          .select('id, type, title, message, order_id, user_id, product_name, amount, created_at, is_read')
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (error) {
          // Generate realistic notifications based on actual orders
          const { data: recentOrders } = await supabase
            .from('orders')
            .select('id, customer_name, product_id, amount, status, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

          if (recentOrders && recentOrders.length > 0) {
            // Get product names
            const productIds = Array.from(new Set(recentOrders.map((o: any) => o.product_id).filter(Boolean)));
            const productsMap = await fetchProductNames(productIds);

            return recentOrders.map((order: any, index: number) => {
              const productName = order.product_id ? productsMap[order.product_id] || 'Product Order' : 'Product Order';
              
              return {
                id: `order-${order.id}`,
                type: order.status === 'paid' ? 'paid_order' as const : 'new_order' as const,
                title: order.status === 'paid' ? 'Payment Received' : 'New Order',
                message: `${order.customer_name} - ${productName} - Rp ${order.amount?.toLocaleString()}`,
                created_at: order.created_at,
                is_read: false,
                amount: order.amount
              };
            });
          }

          // Fallback mock data
          return [
            {
              id: '1',
              type: 'new_order' as const,
              title: 'New Order Received',
              message: 'A new order has been placed',
              created_at: new Date().toISOString(),
              is_read: false
            },
            {
              id: '2',
              type: 'paid_order' as const,
              title: 'Payment Received',
              message: 'Payment has been confirmed for an order',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              is_read: false
            }
          ];
        }
        return data || [];
      } catch (error) {
        // Return basic mock data on any error
        return [
          {
            id: '1',
            type: 'new_order' as const,
            title: 'System Ready',
            message: 'Admin notifications system is operational',
            created_at: new Date().toISOString(),
            is_read: false
          }
        ];
      }
    }, { ttl: 30 * 1000 }); // 30 seconds for real-time notifications
  },

  // Cache invalidation methods
  invalidateCache(pattern?: string) {
    if (pattern) {
      adminCache.invalidatePattern(pattern);
    } else {
      adminCache.clear();
    }
  },

  // Prefetch related data
  async prefetchDashboardData() {
    await adminCache.prefetchBatch([
      { key: 'admin:stats', fetchFn: () => this.getAdminStats() },
      { key: 'admin:notifications:1:20', fetchFn: () => this.getNotifications(1, 20) }
    ]);
  },

  // Cached dashboard stats for instant page loads
  _dashboardStatsCache: null as { data: AdminStats; timestamp: number } | null,
  _dashboardStatsCacheDuration: 60 * 1000, // 1 minute cache

  // Alias for backwards compatibility
  async getDashboardStats(): Promise<AdminStats> {
    // Check cache first for instant loading
    const now = Date.now();
    if (this._dashboardStatsCache && (now - this._dashboardStatsCache.timestamp) < this._dashboardStatsCacheDuration) {
      return this._dashboardStatsCache.data;
    }

    // Use the admin API endpoint instead of direct Supabase queries
    // This ensures we use service_role key for proper data access
    try {
      // Use fetchWithRetry to handle 401 race conditions after login
      const response = await fetchWithRetry('/api/admin?action=dashboard-stats', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform API response to AdminStats format
      const stats: AdminStats = {
        totalOrders: data.orders?.count || 0,
        totalRevenue: data.orders?.revenue || 0,
        totalUsers: data.users?.count || 0,
        totalProducts: data.products?.count || 0,
        totalReviews: data.reviews?.count || 0,
        averageRating: data.reviews?.averageRating || 0,
        pendingOrders: data.orders?.pending || 0,
        completedOrders: data.orders?.completed || 0,
        totalFlashSales: data.flashSales?.count || 0,
        activeFlashSales: 0
      };

      // Cache the result
      this._dashboardStatsCache = { data: stats, timestamp: now };
      
      return stats;
    } catch (error) {
      console.error('[adminService.getDashboardStats] Error calling API:', error);
      // Fallback to direct Supabase queries if API fails
      return this.getAdminStats();
    }
  },

  // Search functionality
  async searchAll(query: string): Promise<{
    orders: Order[];
    users: User[];
    products: Product[];
    reviews: Review[];
  }> {
    const [orders, users, products, reviews] = await Promise.all([
      this.searchOrders(query),
      this.searchUsers(query),
      this.searchProducts(query),
      this.searchReviews(query)
    ]);

    return { orders, users, products, reviews };
  },

  async searchOrders(query: string): Promise<Order[]> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    // Remove relational selects; search only local columns
    const { data } = await supabase
      .from('orders')
      .select('id, customer_name, amount, status, order_type, rental_duration, created_at, updated_at, user_id, product_id, customer_email, customer_phone, payment_method, xendit_invoice_id, client_external_id')
      .or(`id.ilike.%${query}%,customer_name.ilike.%${query}%,customer_email.ilike.%${query}%`)
      .limit(10);

    // Get product names for the search results
    const productIds = Array.from(new Set((data || []).map((o: any) => o.product_id).filter(Boolean)));
    const productsMap = await fetchProductNames(productIds);

    return (data || []).map((o: any) => ({
      id: o.id,
      customer_name: o.customer_name || 'Unknown Customer',
      product_name: o.product_id ? productsMap[o.product_id] : undefined,
      amount: Number(o.amount) || 0,
      status: o.status || 'pending',
      order_type: o.order_type || 'purchase',
      created_at: o.created_at,
      updated_at: o.updated_at,
      user_id: o.user_id,
      product_id: o.product_id,
      customer_email: o.customer_email,
      customer_phone: o.customer_phone,
      payment_method: o.payment_method,
      xendit_invoice_id: o.xendit_invoice_id
    }));
  },

  async searchUsers(query: string): Promise<User[]> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, phone, created_at, is_admin, last_login')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);
    
    return data || [];
  },

  async searchProducts(query: string): Promise<Product[]> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data } = await supabase
      .from('products')
      .select('id, name, description, price, original_price, category_id, game_title, account_level, account_details, stock, is_active, created_at, updated_at, image, images, tier, tier_id, game_title_id, is_flash_sale, flash_sale_end_time, has_rental, archived_at')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(10);
    
    return data || [];
  },

  async searchReviews(query: string): Promise<Review[]> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    try {
      const { data } = await supabase
        .from('reviews')
        .select('id, product_id, user_id, rating, comment, created_at')
        .or(`comment.ilike.%${query}%`)
        .limit(10);

      // Get product names
      const productIds = Array.from(new Set((data || []).map((r: any) => r.product_id).filter(Boolean)));
      const productsMap = await fetchProductNames(productIds);

      // Get user names
      const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
      const usersMap = await fetchUserNames(userIds);

      return (data || []).map((r: any) => ({
        id: r.id,
        product_id: r.product_id,
        user_id: r.user_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        product_name: r.product_id ? productsMap[r.product_id] : undefined,
        user_name: r.user_id ? usersMap[r.user_id] : undefined
      }));
    } catch (error) {
      return [];
    }
  },

  // Create sample reviews method
  async createSampleReviews(): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const sampleComments = [
      'Produk sangat bagus! Kualitas premium dan pelayanan memuaskan.',
      'Rekomendasi banget! Akun game nya legit dan proses cepat.',
      'Pelayanan ramah, akun sesuai deskripsi. Puas dengan pembelian ini.',
      'Good seller, trusted! Akun game berkualitas tinggi.',
      'Terima kasih, produk sesuai ekspektasi. Akan beli lagi di sini.',
      'Fast response dan akun berkualitas. Highly recommended!',
      'Service excellent, akun game sesuai dengan yang dijanjikan.',
      'Transaksi lancar, seller responsif. Akun game premium quality.',
      'Sangat memuaskan! Proses cepat dan akun sesuai deskripsi.',
      'Top seller! Pelayanan ramah dan akun game berkualitas tinggi.'
    ];

    // Get sample users and products
    const [{ data: users }, { data: products }] = await Promise.all([
      supabase.from('users').select('id').limit(5),
      supabase.from('products').select('id').eq('is_active', true).limit(3)
    ]);

    if (!users?.length || !products?.length) {
      throw new Error('No users or products found for sample data');
    }

    const reviews: Array<{
      user_id: string;
      product_id: string;
      rating: number;
      comment: string;
      is_verified: boolean;
    }> = [];
    for (let i = 0; i < 10; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
      
      reviews.push({
        user_id: randomUser.id,
        product_id: randomProduct.id,
        rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        comment: randomComment,
        is_verified: Math.random() < 0.7 // 70% verified
      });
    }

    const { error } = await supabase
      .from('reviews')
      .insert(reviews);

    if (error) throw error;
  },

  // Enhanced Feed Posts Management
  async createFeedPost(data: {
    title?: string;
    content: string;
    type: 'post' | 'announcement';
    image_url?: string;
    is_pinned?: boolean;
  }): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('feed_posts')
      .insert({
        ...data,
        user_id: user.user.id,
        likes_count: 0,
        comments_count: 0,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    
    // Clear cache
    adminCache.clear();
  },

  async updateFeedPost(id: string, data: {
    title?: string;
    content: string;
    type: 'post' | 'announcement';
    image_url?: string;
    is_pinned?: boolean;
  }): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { error } = await supabase
      .from('feed_posts')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    
    // Clear cache
    adminCache.clear();
  },

  async toggleFeedPostPin(id: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data: post, error: fetchError } = await supabase
      .from('feed_posts')
      .select('is_pinned')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('feed_posts')
      .update({ 
        is_pinned: !post.is_pinned,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    
    // Clear cache
    adminCache.clear();
  },

  async deleteFeedPostPermanent(id: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { error } = await supabase
      .from('feed_posts')
      .update({ 
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    
    // Clear cache
    adminCache.clear();
  },

  // Helper functions for dropdowns
  async getCategories(): Promise<Array<{ id: string; name: string; slug?: string }>> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getGameTitles(): Promise<Array<{ id: string; name: string; slug?: string }>> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data, error } = await supabase
      .from('game_titles')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getTiers(): Promise<Array<{ id: string; name: string; slug?: string }>> {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data, error } = await supabase
      .from('tiers')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  // Product CRUD Operations
  async createProduct(data: {
    name: string;
    description: string;
    price: number;
    original_price?: number;
    category_id?: string;
    game_title_id?: string;
    tier_id?: string;
    image?: string;
    images?: string[];
    stock?: number;
    is_active?: boolean;
    has_rental?: boolean;
  }): Promise<Product> {
    // Ensure images array is set and image field uses first image or placeholder
    const images = data.images && data.images.length > 0 ? data.images : [];
    const image = images.length > 0 ? images[0] : (data.image || 'https://via.placeholder.com/400x300?text=No+Image');
    
    const productData = {
      ...data,
      image,
      images,
      stock: data.stock || 1,
      is_active: data.is_active !== undefined ? data.is_active : true,
    };
    
    // Use API endpoint with service role to bypass RLS
    try {
      const sessionToken = localStorage.getItem('session_token') || '';
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          action: 'createProduct',
          ...productData
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('[adminService.createProduct] API error:', result);
        throw new Error(result.details || result.message || result.error || 'Failed to create product');
      }
      
      // Clear cache
      adminCache.clear();
      
      return result.data as Product;
    } catch (error: any) {
      console.error('[adminService.createProduct] Exception:', error);
      throw error;
    }
  },

  async updateProduct(id: string, data: {
    name?: string;
    description?: string;
    price?: number;
    original_price?: number;
    category_id?: string;
    game_title_id?: string;
    tier_id?: string;
    image?: string;
    images?: string[];
    stock?: number;
    is_active?: boolean;
    has_rental?: boolean;
  }): Promise<Product> {
    // Ensure image field is updated if images array is provided
    const updateData: any = { ...data };
    if (data.images && data.images.length > 0) {
      updateData.image = data.images[0];
    }
    
    const finalUpdateData = {
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    // Try API endpoint first (has service role to bypass RLS)
    try {
      const sessionToken = localStorage.getItem('session_token') || '';
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          action: 'updateProduct',
          id,
          fields: finalUpdateData
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success && result.data) {
        adminCache.invalidatePattern('admin:products');
        return result.data as Product;
      } else {
        console.warn('[adminService.updateProduct] API failed:', result.error || 'Unknown error');
      }
    } catch (apiError) {
      console.warn('[adminService.updateProduct] API call failed:', apiError);
    }
    
    // Fallback to direct Supabase (may be blocked by RLS)
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data: products, error } = await supabase
      .from('products')
      .update(finalUpdateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    
    // Clear cache
    adminCache.clear();
    
    // If RLS blocks SELECT after UPDATE, fetch the product separately
    if (!products || products.length === 0) {
      console.warn('RLS may have blocked SELECT after UPDATE, fetching product separately');
      const { data: fetchedProducts, error: fetchError } = await supabase
        .from('products')
        .select('id, name, description, price, original_price, image, images, is_active, stock, created_at, updated_at, category_id, game_title_id, tier_id, has_rental, archived_at')
        .eq('id', id)
        .limit(1);
      
      if (fetchError || !fetchedProducts || fetchedProducts.length === 0) {
        // If we still can't fetch, return a merged object with the update data
        console.warn('Could not fetch product after update, returning merged data');
        return {
          id,
          ...finalUpdateData
        } as Product;
      }
      
      return fetchedProducts[0] as Product;
    }
    
    return products[0] as Product;
  },

  // ========================================
  // WHATSAPP SETTINGS
  // ========================================

  /**
   * Get WhatsApp settings (provider, API key, groups)
   * Cached for 2 minutes
   */
  async getWhatsAppSettings(): Promise<{
    provider: {
      id: string;
      name: string;
      display_name: string;
      base_url: string;
      settings: {
        default_group_id?: string;
        group_configurations?: {
          purchase_orders?: string;
          rental_orders?: string;
          flash_sales?: string;
          general_notifications?: string;
        };
      };
    } | null;
    apiKey: {
      id: string;
      key_name: string;
      api_key: string;
      is_active: boolean;
      is_primary: boolean;
      usage_count: number;
      last_used_at: string | null;
    } | null;
  }> {
    const CACHE_KEY = 'admin:whatsapp:settings';
    const cached = adminCache.get<{
      provider: any;
      apiKey: any;
    }>(CACHE_KEY);
    if (cached) return cached;

    const sessionToken = localStorage.getItem('session_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch('/api/admin-whatsapp', { headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to load WhatsApp settings');
    }

    const result = {
      provider: data.provider || null,
      apiKey: data.api_key || null
    };

    adminCache.set(CACHE_KEY, result, 2 * 60 * 1000); // 2 minute cache
    return result;
  },

  /**
   * Get WhatsApp groups
   * Cached for 2 minutes
   */
  async getWhatsAppGroups(): Promise<Array<{ id: string; name: string }>> {
    const CACHE_KEY = 'admin:whatsapp:groups';
    const cached = adminCache.get<Array<{ id: string; name: string }>>(CACHE_KEY);
    if (cached) return cached;

    const sessionToken = localStorage.getItem('session_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch('/api/admin-whatsapp-groups', { headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to load groups');
    }

    const groups = data.groups || [];
    adminCache.set(CACHE_KEY, groups, 2 * 60 * 1000); // 2 minute cache
    return groups;
  },

  /**
   * Update WhatsApp API key
   */
  async updateWhatsAppApiKey(apiKey: string): Promise<{
    api_key: string;
    provider: any;
  }> {
    const sessionToken = localStorage.getItem('session_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch('/api/admin-whatsapp', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ api_key: apiKey.trim() })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to update API key');
    }

    // Invalidate cache
    adminCache.invalidatePattern('admin:whatsapp');

    return data;
  },

  /**
   * Update WhatsApp configuration (default group, group configurations)
   */
  async updateWhatsAppConfig(config: {
    default_group_id?: string | null;
    group_configurations?: {
      purchase_orders?: string;
      rental_orders?: string;
      flash_sales?: string;
      general_notifications?: string;
    };
  }): Promise<{ provider: any }> {
    const sessionToken = localStorage.getItem('session_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const response = await fetch('/api/admin-whatsapp', {
      method: 'PUT',
      headers,
      body: JSON.stringify(config)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to save configuration');
    }

    // Invalidate cache
    adminCache.invalidatePattern('admin:whatsapp');

    return data;
  },

  /**
   * Send test WhatsApp message
   */
  async sendTestWhatsAppMessage(message: string, groupId?: string): Promise<{
    success: boolean;
    messageId?: string;
    provider?: string;
    responseTime?: number;
    error?: string;
  }> {
    const response = await fetch('/api/xendit/webhook?testGroupSend=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message, 
        groupId: groupId || undefined 
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to send test message');
    }

    return {
      success: true,
      messageId: data.messageId || data.message_id,
      provider: data.provider,
      responseTime: data.responseTime
    };
  },

  /**
   * Get WhatsApp stats for analytics cards
   */
  async getWhatsAppStats(): Promise<{
    isConnected: boolean;
    activeGroups: number;
    providerName: string;
    apiUsage: number;
    lastActivity: string;
  }> {
    const settings = await this.getWhatsAppSettings();
    const groups = await this.getWhatsAppGroups().catch(() => []);

    return {
      isConnected: settings.apiKey?.is_active || false,
      activeGroups: groups.length,
      providerName: settings.provider?.display_name || settings.provider?.name || 'Unknown',
      apiUsage: settings.apiKey?.usage_count || 0,
      lastActivity: settings.apiKey?.last_used_at 
        ? new Date(settings.apiKey.last_used_at).toLocaleString()
        : 'Never'
    };
  }
};
