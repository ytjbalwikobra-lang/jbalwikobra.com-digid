import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Enhanced types with better structure
export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  totalReviews: number;
  averageRating: number;
  pendingOrders: number;
  completedOrders: number;
  todayOrders: number;
  todayRevenue: number;
}

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  original_price?: number;
  image?: string;
  images?: string[];
  // migrated: category string removed in favor of category_id FK
  category_id: string; // REQUIRED
  is_flash_sale?: boolean;
  flash_sale_end_time?: string;
  has_rental?: boolean;
  stock: number;
  tier_id?: string;
  game_title_id?: string;
  is_active?: boolean;
  archived_at?: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  image: string;
  images: string[];
  category_id: string; // FK
  categoryData?: CategoryRef; // joined data
  is_flash_sale: boolean;
  flash_sale_end_time?: string;
  has_rental: boolean;
  stock: number;
  created_at: string;
  updated_at?: string;
  tier_id?: string;
  game_title_id?: string;
  is_active: boolean;
  archived_at?: string;
}

export interface Order {
  user_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  amount: number; // renamed from total_amount to match DB
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  payment_method?: string;
  payment_id?: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  meta_data?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
  is_admin: boolean;
  is_active: boolean;
  last_login?: string;
  total_orders?: number;
  total_spent?: number;
  meta_data?: Record<string, any>;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  product?: Product;
  user?: User;
  helpful_count?: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  link_url?: string;
  link_text?: string;
  is_active: boolean;
  sort_order: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at?: string;
  target_audience?: string[];
  meta_data?: Record<string, any>;
}

export interface FlashSale {
  id: string;
  product_id: string;
  sale_price: number;
  original_price: number;
  discount_percentage: number;
  start_time: string;
  end_time: string;
  stock: number;
  sold_count: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  product?: Product;
  meta_data?: Record<string, any>;
}

export interface FeedPost {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  post_type: 'announcement' | 'news' | 'promotion' | 'tutorial' | 'other';
  is_active: boolean;
  is_featured: boolean;
  is_pinned: boolean;
  author_id?: string;
  author_name: string;
  created_at: string;
  updated_at?: string;
  published_at?: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  tags?: string[];
  meta_data?: Record<string, any>;
}

// Pagination and filtering types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  category_id?: string; // new FK based filtering
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Enhanced Admin Service with better error handling and caching
class EnhancedAdminService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  // Telemetry counters (in-memory only)
  private telemetry = {
    productsRelationalSuccess: 0,
    productsRelationalFallback: 0
  };

  getTelemetry() {
    return { ...this.telemetry };
  }

  resetTelemetry() {
    this.telemetry.productsRelationalSuccess = 0;
    this.telemetry.productsRelationalFallback = 0;
  }

  // Cache management
  private getCacheKey(operation: string, params?: any): string {
    return `${operation}_${JSON.stringify(params || {})}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, customTtl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTtl || this.CACHE_TTL
    });
  }

  private clearCacheByPattern(pattern: string): void {
    const keys = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
    keys.forEach(key => this.cache.delete(key));
  }

  // Error handling wrapper
  private async handleApiCall<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed'
  ): Promise<ApiResponse<T>> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error: any) {
      console.error(`${errorMessage}:`, error);
      return {
        success: false,
        error: error.message || errorMessage,
        message: error.message || errorMessage
      };
    }
  }

  // Dashboard Stats with enhanced metrics
  async getDashboardStats(): Promise<ApiResponse<AdminStats>> {
    const cacheKey = this.getCacheKey('dashboard_stats');
    const cached = this.getFromCache<AdminStats>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    return this.handleApiCall(async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [
        { count: totalUsers },
        { count: totalProducts },
        { count: totalOrders },
        { count: pendingOrders },
        { count: completedOrders },
        { count: paidOrders },
        { count: todayOrders },
        ordersWithAmounts,
        todayOrdersWithAmounts,
        reviewsData
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('orders').select('amount, status').in('status', ['paid', 'completed']),
        supabase.from('orders').select('amount').gte('created_at', today),
        supabase.from('reviews').select('rating')
      ]);

      const totalRevenue = ordersWithAmounts.data?.reduce((sum, order) => 
  sum + (Number(order.amount) || 0), 0) || 0;

      const todayRevenue = todayOrdersWithAmounts.data?.reduce((sum, order) => 
  sum + (Number(order.amount) || 0), 0) || 0;

      const reviewsArray = reviewsData.data || [];
      const averageRating = reviewsArray.length > 0
        ? reviewsArray.reduce((sum, review) => sum + review.rating, 0) / reviewsArray.length
        : 0;

      // Reinterpret totalReviews as count of all orders that are paid or completed (business request)
      const paidCompletedCount = ordersWithAmounts.data?.length || 0;
      const stats: AdminStats = {
        totalOrders: totalOrders || 0,
        totalRevenue,
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
        totalReviews: paidCompletedCount, // updated logic per requirement
        averageRating: Math.round(averageRating * 10) / 10,
        pendingOrders: pendingOrders || 0,
        completedOrders: (completedOrders || 0) + (paidOrders || 0), // Count both paid and completed orders
        todayOrders: todayOrders || 0,
        todayRevenue
      };

      this.setCache(cacheKey, stats);
      return stats;
    }, 'Failed to fetch dashboard stats');
  }

  // Enhanced Products CRUD
  async getProducts(
    pagination: PaginationParams,
    filters: FilterParams = {}
  ): Promise<ApiResponse<PaginatedResponse<Product>>> {
    const cacheKey = this.getCacheKey('products', { pagination, filters });
    const cached = this.getFromCache<PaginatedResponse<Product>>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    return this.handleApiCall(async () => {
      // Attempt relational join first; fallback to basic select if schema mismatch
      let relational = true;
      let query = supabase.from('products').select('id, name, description, price, original_price, image, images, is_active, stock, created_at, updated_at, category_id, game_title_id, tier_id, has_rental, archived_at, categories:categories(id,name,slug,description,icon,color,is_active,sort_order)', { count: 'exact' });

      // Apply filters
      if (filters.search) {
        // search across name & description only (legacy category removed)
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters.status) {
        query = query.eq('is_active', filters.status === 'active');
      }

      // Apply sorting
      const sortBy = pagination.sortBy || 'created_at';
      const sortOrder = pagination.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (pagination.page - 1) * pagination.limit;
      const to = from + pagination.limit - 1;
      query = query.range(from, to);

      let data, error, count;
      ({ data, error, count } = await query);
      if (error) {
        // If join fails (e.g., column/category relation missing), retry without join
        this.telemetry.productsRelationalFallback++;
        console.warn('[enhancedAdminService.getProducts] relational select failed, falling back:', error.message);
        relational = false;
        const basic = supabase.from('products').select('id, name, description, price, original_price, image, images, is_active, stock, created_at, updated_at, category_id, game_title_id, tier_id, has_rental, archived_at', { count: 'exact' })
          .order(sortBy, { ascending: sortOrder === 'asc' })
          .range(from, to);
        ({ data, error, count } = await basic);
        if (error) throw error;
      } else {
        this.telemetry.productsRelationalSuccess++;
      }

      const mapped: Product[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        original_price: row.original_price,
        image: row.image || '',
        images: row.images || [],
        category_id: row.category_id,
        categoryData: relational && row.categories ? {
          id: row.categories.id,
          name: row.categories.name,
          slug: row.categories.slug,
          description: row.categories.description,
          icon: row.categories.icon,
          color: row.categories.color,
          is_active: row.categories.is_active,
          sort_order: row.categories.sort_order
        } : undefined,
  // legacy game_title column removed (FK only) - account_details deprecated
        is_flash_sale: row.is_flash_sale || false,
        flash_sale_end_time: row.flash_sale_end_time,
        has_rental: row.has_rental || false,
        stock: row.stock || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
        tier_id: row.tier_id,
        game_title_id: row.game_title_id,
        is_active: row.is_active,
        archived_at: row.archived_at
      }));

      const totalPages = Math.ceil((count || 0) / pagination.limit);
      const result: PaginatedResponse<Product> = {
        data: mapped,
        count: count || 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1
      };

      this.setCache(cacheKey, result);
      return result;
    }, 'Failed to fetch products');
  }

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    const cacheKey = this.getCacheKey('product', { id });
    const cached = this.getFromCache<Product>(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    return this.handleApiCall(async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price, original_price, image, images, is_active, stock, created_at, updated_at, category_id, game_title_id, tier_id, has_rental, archived_at, categories:categories(id,name,slug,description,icon,color,is_active,sort_order)')
        .eq('id', id)
        .single();

      if (error) throw error;
      const row = data as any; // Type assertion for flexible property access
      const mapped: Product = {
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        original_price: row.original_price,
        image: row.image || '',
        images: row.images || [],
        category_id: row.category_id,
        categoryData: row.categories ? {
          id: row.categories.id,
            name: row.categories.name,
            slug: row.categories.slug,
            description: row.categories.description,
            icon: row.categories.icon,
            color: row.categories.color,
            is_active: row.categories.is_active,
            sort_order: row.categories.sort_order
        } : undefined,
  // legacy game_title column removed (relational-only)
  // account_details removed
        is_flash_sale: row.is_flash_sale || false,
        flash_sale_end_time: row.flash_sale_end_time,
        has_rental: row.has_rental || false,
        stock: row.stock || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
        tier_id: row.tier_id,
        game_title_id: row.game_title_id,
        is_active: row.is_active,
        archived_at: row.archived_at
      };
      this.setCache(cacheKey, mapped);
      return mapped;
    }, 'Failed to fetch product');
  }

  async createProduct(product: CreateProductData): Promise<ApiResponse<Product>> {
    return this.handleApiCall(async () => {
      if (!product.category_id) {
        throw new Error('category_id is required');
      }
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: product.name,
          description: product.description,
          price: product.price,
          original_price: product.original_price,
          image: product.image || '',
          images: product.images || [],
          category_id: product.category_id,
          // legacy text column removed (only using FK)
          // game_title omitted intentionally
          // account_details removed
          is_flash_sale: product.is_flash_sale || false,
          flash_sale_end_time: product.flash_sale_end_time,
          has_rental: product.has_rental || false,
          stock: product.stock,
          tier_id: product.tier_id,
          game_title_id: product.game_title_id,
          is_active: product.is_active !== undefined ? product.is_active : true,
          archived_at: product.archived_at,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      this.clearCacheByPattern('products');
      return data;
    }, 'Failed to create product');
  }

  async createTestProduct(): Promise<ApiResponse<Product>> {
    const timestamp = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const testProduct: CreateProductData = {
      name: `Test Product Debug ${timestamp}`,
      description: `Ini adalah produk test untuk debugging yang dibuat pada ${timestamp}. Produk ini berfungsi normal dan bisa digunakan untuk testing fitur admin.`,
      price: 15000,
      original_price: 20000,
      image: 'https://via.placeholder.com/400x300/6366f1/ffffff?text=TEST+PRODUCT',
      images: ['https://via.placeholder.com/400x300/6366f1/ffffff?text=TEST+PRODUCT'],
      category_id: 'sample-cat-debug',
  // legacy game_title removed
  // account_details removed
      is_flash_sale: false,
      has_rental: false,
      stock: 999,
      is_active: true
    };

    return this.createProduct(testProduct);
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.handleApiCall(async () => {
      const { data, error } = await supabase
        .from('products')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      this.clearCacheByPattern('products');
      this.clearCacheByPattern('product');
      return data;
    }, 'Failed to update product');
  }

  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    return this.handleApiCall(async () => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      this.clearCacheByPattern('products');
      this.clearCacheByPattern('product');
    }, 'Failed to delete product');
  }

  // Similar enhanced methods for Orders, Users, Reviews, Banners, FlashSales, and FeedPosts
  // ... (I'll implement the other CRUD methods following the same pattern)

  // Bulk operations
  async bulkUpdateProducts(ids: string[], updates: Partial<Product>): Promise<ApiResponse<Product[]>> {
    return this.handleApiCall(async () => {
      const { data, error } = await supabase
        .from('products')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select();

      if (error) throw error;
      this.clearCacheByPattern('products');
      return data;
    }, 'Failed to bulk update products');
  }

  async bulkDeleteProducts(ids: string[]): Promise<ApiResponse<void>> {
    return this.handleApiCall(async () => {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', ids);

      if (error) throw error;
      this.clearCacheByPattern('products');
    }, 'Failed to bulk delete products');
  }

  // Clear all cache
  clearCache(): void {
    this.cache.clear();
  }
}

export const enhancedAdminService = new EnhancedAdminService();
export default enhancedAdminService;

// Dev-only global exposure for quick diagnostics
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).__APP_TELEMETRY = {
    get: () => enhancedAdminService.getTelemetry(),
    reset: () => enhancedAdminService.resetTelemetry()
  };
}
