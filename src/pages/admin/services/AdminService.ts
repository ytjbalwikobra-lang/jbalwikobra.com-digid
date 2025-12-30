// Admin API Services
import { Product, Order, User, FeedPost, DashboardStats } from '../types';

export class AdminService {
  static async fetchDashboardStats(): Promise<DashboardStats> {
    console.log('🚀 [AdminService.fetchDashboardStats] Starting dashboard stats fetch...');
    
    try {
      const url = '/api/admin?action=dashboard';
      console.log('🌐 [AdminService.fetchDashboardStats] Fetching from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('📡 [AdminService.fetchDashboardStats] Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [AdminService.fetchDashboardStats] API request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        
        // Return fallback with error logging
        console.warn('⚠️ [AdminService.fetchDashboardStats] Returning fallback zeros due to API error');
        return {
          orders: { count: 0, completed: 0, revenue: 0, completedRevenue: 0 },
          users: { count: 0 },
          products: { count: 0 },
          flashSales: { count: 0 }
        };
      }
      
      const data = await response.json();
      console.log('📥 [AdminService.fetchDashboardStats] Raw response data:', JSON.stringify(data, null, 2));
      
      // Handle both formats: direct data or wrapped in data property
      const stats = data.data || data;
      console.log('✅ [AdminService.fetchDashboardStats] Parsed stats:', JSON.stringify(stats, null, 2));
      
      return stats;
    } catch (error) {
      console.error('❌ [AdminService.fetchDashboardStats] Exception occurred:', error);
      console.error('❌ [AdminService.fetchDashboardStats] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Return fallback with error logging
      console.warn('⚠️ [AdminService.fetchDashboardStats] Returning fallback zeros due to exception');
      return {
        orders: { count: 0, completed: 0, revenue: 0, completedRevenue: 0 },
        users: { count: 0 },
        products: { count: 0 },
        flashSales: { count: 0 }
      };
    }
  }

  static async fetchOrders(limit: number = 10): Promise<Order[]> {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await fetch(`/api/admin?action=orders&limit=${limit}`, { headers });
      if (!response.ok) {
        console.warn('Orders API failed, returning empty array');
        return [];
      }
      const data = await response.json();
      return data.orders || data.data || [];
    } catch (error) {
      console.warn('Orders API error:', error);
      return [];
    }
  }

  static async fetchUsers(limit: number = 10): Promise<User[]> {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await fetch(`/api/admin?action=users&limit=${limit}`, { headers });
      if (!response.ok) {
        console.warn('Users API failed, returning empty array');
        return [];
      }
      const data = await response.json();
      return data.users || data.data || [];
    } catch (error) {
      console.warn('Users API error:', error);
      return [];
    }
  }

  static async fetchProducts(limit: number = 10): Promise<Product[]> {
    const { supabase } = await import('../../../services/supabase');
    if (!supabase) throw new Error('Supabase not available');
    
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, name, description, price, original_price, category_id, ' +
        'game_title, account_level, account_details, stock, is_active, ' +
        'created_at, updated_at, image, images, tier, tier_id, ' +
        'game_title_id, is_flash_sale, flash_sale_end_time, has_rental, archived_at'
      )
      .is('archived_at', null) // Filter out archived products
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as unknown as Product[]) || [];
  }

  static async fetchFeedPosts(limit: number = 10): Promise<FeedPost[]> {
    const { supabase } = await import('../../../services/supabase');
    if (!supabase) throw new Error('Supabase not available');
    
    const { data, error } = await supabase
      .from('feed_posts')
      .select('id, content, image_url, user_id, created_at, updated_at, is_deleted, likes_count')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as unknown as FeedPost[]) || [];
  }

  static async saveProduct(product: Partial<Product>): Promise<Product> {
    const { supabase } = await import('../../../services/supabase');
    if (!supabase) throw new Error('Supabase not available');

    if (product.id) {
      // Update existing product
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new product
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  static async deleteProduct(id: string): Promise<void> {
    const { supabase } = await import('../../../services/supabase');
    if (!supabase) throw new Error('Supabase not available');

    // Archive the product instead of deleting it
    const { error } = await supabase
      .from('products')
      .update({ 
        is_active: false, 
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }

  static async saveFeedPost(post: Partial<FeedPost>): Promise<FeedPost> {
    const { supabase } = await import('../../../services/supabase');
    if (!supabase) throw new Error('Supabase not available');

    if (post.id) {
      // Update existing post
      const { data, error } = await supabase
        .from('feed_posts')
        .update(post)
        .eq('id', post.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new post
      const { data, error } = await supabase
        .from('feed_posts')
        .insert([{
          ...post,
          author_id: 'admin', // Replace with actual admin user ID
          author_name: 'Administrator',
          is_deleted: false
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  static async deleteFeedPost(id: string): Promise<void> {
    const { supabase } = await import('../../../services/supabase');
    if (!supabase) throw new Error('Supabase not available');

    const { error } = await supabase
      .from('feed_posts')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) throw error;
  }
}
