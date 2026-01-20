/**
 * Unified Admin API Client
 * 
 * Centralized API client untuk halaman admin dengan fokus pada:
 * - Optimalisasi Egress Supabase
 * - Smart Caching dengan adminCache
 * - Request Batching
 * - Intelligent Prefetching
 * - Error Handling dengan Fallback
 * - Monitoring dan Analytics
 */

import { adminCache } from './adminCache';

// Types untuk API responses
export interface AdminDashboardStats {
  orders: {
    count: number;
    completed: number;
    pending: number;
    revenue: number;
    completedRevenue: number;
  };
  users: {
    count: number;
  };
  products: {
    count: number;
  };
  flashSales: {
    count: number;
  };
  reviews: {
    count: number;
    averageRating: number;
  };
}

export interface AdminOrder {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_name?: string;
  amount: number;
  status: string;
  order_type: string;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

export interface AdminProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  is_active: boolean;
  is_flash_sale: boolean;
  flash_sale_price?: number;
  stock_quantity?: number;
  created_at: string;
}

export interface AdminNotification {
  id: string;
  type: 'new_order' | 'paid_order' | 'cancelled_order' | 'new_user' | 'low_stock';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

export interface OrderStatusTimeSeries {
  date: string;
  pending: number;
  completed: number;
  cancelled: number;
  paid: number;
  total: number;
}

interface APIRequestOptions {
  skipCache?: boolean;
  timeout?: number;
  retries?: number;
  backgroundRefresh?: boolean;
}

interface BatchRequest {
  id: string;
  endpoint: string;
  params?: Record<string, any>;
}

class UnifiedAdminClient {
  private readonly BASE_URL = '/api/admin';
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly CACHE_TTL = {
    DASHBOARD_STATS: 2 * 60 * 1000, // 2 minutes
    ORDERS: 30 * 1000, // 30 seconds
    USERS: 5 * 60 * 1000, // 5 minutes
    PRODUCTS: 5 * 60 * 1000, // 5 minutes  
    NOTIFICATIONS: 15 * 1000, // 15 seconds
    TIME_SERIES: 5 * 60 * 1000, // 5 minutes
  };

  private stats = {
    apiCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    totalBytes: 0,
  };

  /**
   * Make API request with intelligent caching and error handling
   */
  private async apiRequest<T>(
    endpoint: string,
    options: APIRequestOptions = {}
  ): Promise<T> {
    // Backward compatibility: normalize legacy action names inside endpoint query
    if (endpoint.startsWith('?')) {
      const usp = new URLSearchParams(endpoint.substring(1));
      const action = usp.get('action');
      if (action === 'dashboard') usp.set('action', 'dashboard-stats');
      if (action === 'notifications') usp.set('action', 'recent-notifications');
      endpoint = `?${usp.toString()}`;
    }

    const cacheKey = `admin:${endpoint}`;
  const { skipCache = false, timeout = this.DEFAULT_TIMEOUT, retries = 2 } = options;
  // In local dev, avoid multiple failing attempts to reduce console noise
  const effectiveRetries = this.isLocalDev() ? 0 : retries;

    // Try cache first (unless skipped)
    if (!skipCache) {
      try {
        const cached = adminCache.get<T>(cacheKey);
        if (cached) {
          this.stats.cacheHits++;
          
          // Background refresh if requested
          if (options.backgroundRefresh) {
            this.refreshInBackground(endpoint, options);
          }
          
          return cached;
        }
      } catch (error) {
        console.warn(`Cache error for ${cacheKey}:`, error);
      }
    }

    // Make API request with retries
    let lastError: Error;
    
  for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
      try {
        this.stats.apiCalls++;
        this.stats.cacheMisses++;
        
        const response = await this.fetchWithTimeout(endpoint, timeout);
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Track response size for egress monitoring
        this.stats.totalBytes += JSON.stringify(data).length;

        // Cache the response
        this.setCacheWithTTL(cacheKey, data, endpoint);
        
        return data;
        
      } catch (error) {
        lastError = error as Error;
        this.stats.errors++;
        
        if (attempt < retries) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // All retries failed, try to return stale cache if available
    try {
      const staleData = adminCache.getStale<T>(cacheKey);
      if (staleData) {
        console.warn(`Using stale data for ${endpoint} due to API failure`);
        return staleData;
      }
    } catch (error) {
      // Ignore cache errors
    }

    // Development fallback: return mock data locally to avoid noisy 400s when /api is not running
    if (this.isLocalDev()) {
      const mock = this.getMockDataForEndpoint<T>(endpoint);
      if (mock !== undefined) {
        // Cache mock to reduce repeated generation
        try { this.setCacheWithTTL(cacheKey, mock, endpoint); } catch {}
        // Only warn once for visibility
        console.warn(`Using mock admin data for ${endpoint} (local dev fallback)`);
        return mock as T;
      }
    }

    throw lastError!;
  }

  /**
   * Fetch with timeout support and authentication
   */
  private async fetchWithTimeout(endpoint: string, timeout: number): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.BASE_URL}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // ✅ SECURITY: Get session token and include in Authorization header
      const sessionToken = localStorage.getItem('session_token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if session token exists
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers,
      });
      
      clearTimeout(timeoutId);
      
      // Handle 401 Unauthorized - session expired
      if (response.status === 401) {
        console.warn('[unifiedAdminClient] Session expired or unauthorized');
        // Clear local storage and redirect to login
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('session_expires');
        window.location.href = '/auth?redirect=' + encodeURIComponent(window.location.pathname);
        throw new Error('Session expired. Please login again.');
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Set cache with appropriate TTL based on endpoint
   */
  private setCacheWithTTL(cacheKey: string, data: any, endpoint: string): void {
    let ttl = this.CACHE_TTL.DASHBOARD_STATS; // default

    if (endpoint.includes('dashboard')) {
      ttl = this.CACHE_TTL.DASHBOARD_STATS;
    } else if (endpoint.includes('orders')) {
      ttl = this.CACHE_TTL.ORDERS;
    } else if (endpoint.includes('users')) {
      ttl = this.CACHE_TTL.USERS;
    } else if (endpoint.includes('products')) {
      ttl = this.CACHE_TTL.PRODUCTS;
    } else if (endpoint.includes('notifications')) {
      ttl = this.CACHE_TTL.NOTIFICATIONS;
    } else if (endpoint.includes('time-series')) {
      ttl = this.CACHE_TTL.TIME_SERIES;
    }

    adminCache.set(cacheKey, data, ttl);
  }

  /**
   * Background refresh for hot data
   */
  private async refreshInBackground(endpoint: string, options: APIRequestOptions): Promise<void> {
    try {
      await this.apiRequest(endpoint, { ...options, skipCache: true, backgroundRefresh: false });
    } catch (error) {
      // Silent fail for background refreshes
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===================== PUBLIC API METHODS =====================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(options: APIRequestOptions = {}): Promise<AdminDashboardStats> {
    // Use canonical action name 'dashboard-stats'
    return this.apiRequest<AdminDashboardStats>('?action=dashboard-stats', {
      backgroundRefresh: true,
      ...options
    });
  }

  /**
   * Local-dev detection to provide graceful fallbacks without serverless API
   */
  private isLocalDev(): boolean {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    const devEnv = process.env.NODE_ENV === 'development';
    // Allow opt-out via env flag
    const forceApi = (process.env.REACT_APP_ENABLE_ADMIN_API || '').toLowerCase() === 'true';
    return devEnv && isLocalhost && !forceApi;
  }

  /**
   * Generate mock responses for known endpoints during local development
   */
  private getMockDataForEndpoint<T>(endpoint: string): T | undefined {
    if (!endpoint.startsWith('?')) return undefined;
    const usp = new URLSearchParams(endpoint.substring(1));
    const action = usp.get('action') || '';

    // Dashboard stats mock
    if (action === 'dashboard' || action === 'dashboard-stats') {
      const data = {
        orders: { count: 42, completed: 30, pending: 10, revenue: 12500000, completedRevenue: 9800000 },
        users: { count: 1234 },
        products: { count: 256 },
        flashSales: { count: 3 },
        reviews: { count: 80, averageRating: 4.6 },
      } as AdminDashboardStats;
      return data as unknown as T;
    }

    // Notifications mock
    if (action === 'notifications' || action === 'recent-notifications') {
      const limit = parseInt(usp.get('limit') || '5', 10);
      const types: Array<'new_order'|'paid_order'|'cancelled_order'|'new_user'|'low_stock'> = ['new_order','paid_order','cancelled_order','new_user','low_stock'];
      const now = Date.now();
      const data = Array.from({ length: Math.max(1, Math.min(10, limit)) }).map((_, i) => ({
        id: `mock-${i+1}`,
        type: types[i % types.length],
        title: `Mock notification ${i+1}`,
        message: 'This is a local dev notification.',
        isRead: i > 1,
        createdAt: new Date(now - i * 3600_000).toISOString(),
        metadata: {}
      }));
      return { data } as unknown as T;
    }

    // Time-series mock
    if (action === 'time-series') {
      const daysParam = usp.get('days');
      const startDate = usp.get('startDate');
      const endDate = usp.get('endDate');

      let dates: string[] = [];
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(new Date(d).toISOString().slice(0,10));
        }
      } else {
        const n = Math.max(1, parseInt(daysParam || '7', 10) || 7);
        for (let i = n - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          dates.push(d.toISOString().slice(0,10));
        }
      }

      const series = dates.map((date, idx) => {
        // simple deterministic pseudo-random for stability across renders
        const base = 10 + ((idx * 7) % 6);
        const completed = Math.max(0, base - 2);
        const pending = Math.max(0, 2 - (idx % 3));
        const cancelled = idx % 5 === 0 ? 1 : 0;
        const paid = Math.max(0, completed - 1);
        const total = completed + pending + cancelled + paid;
        return { date, pending, completed, cancelled, paid, total } as OrderStatusTimeSeries;
      });
      return { data: series } as unknown as T;
    }

    // Orders/users/products minimal mock shape (empty) to avoid crashes if called
    if (action === 'orders' || action === 'users' || action === 'products') {
      return { data: [], count: 0, page: 1 } as unknown as T;
    }

    return undefined;
  }

  /**
   * Get orders with pagination and filtering
   */
  async getOrders(
    page: number = 1,
    limit: number = 20,
    status?: string,
    options: APIRequestOptions = {}
  ): Promise<{ data: AdminOrder[]; count: number; page: number }> {
    const params = new URLSearchParams({
      action: 'orders',
      page: page.toString(),
      limit: limit.toString(),
      ...(status && status !== 'all' && { status })
    });

    const endpoint = `?${params.toString()}`;
    return this.apiRequest<{ data: AdminOrder[]; count: number; page: number }>(
      endpoint,
      options
    );
  }

  /**
   * Get users with pagination and search
   */
  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    options: APIRequestOptions = {}
  ): Promise<{ data: AdminUser[]; count: number; page: number }> {
    const params = new URLSearchParams({
      action: 'users',
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });

    const endpoint = `?${params.toString()}`;
    return this.apiRequest<{ data: AdminUser[]; count: number; page: number }>(
      endpoint,
      options
    );
  }

  /**
   * Get products with pagination and search
   */
  async getProducts(
    page: number = 1,
    limit: number = 20,
    search?: string,
    options: APIRequestOptions = {}
  ): Promise<{ data: AdminProduct[]; count: number; page: number }> {
    const params = new URLSearchParams({
      action: 'products',
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });

    const endpoint = `?${params.toString()}`;
    return this.apiRequest<{ data: AdminProduct[]; count: number; page: number }>(
      endpoint,
      options
    );
  }

  /**
   * Get notifications (optimized for real-time updates)
   */
  async getNotifications(
    page: number = 1,
    limit: number = 10,
    options: APIRequestOptions = {}
  ): Promise<AdminNotification[]> {
    // Canonical action name 'recent-notifications'
    const params = new URLSearchParams({
      action: 'recent-notifications',
      page: page.toString(),
      limit: limit.toString()
    });

    const endpoint = `?${params.toString()}`;
    const result = await this.apiRequest<{ data: AdminNotification[] }>(
      endpoint,
      { backgroundRefresh: true, ...options }
    );

    return result.data || [];
  }

  /**
   * Get order status time series data
   */
  async getOrderStatusTimeSeries(
    options: { days?: number; startDate?: string; endDate?: string } = {},
    requestOptions: APIRequestOptions = {}
  ): Promise<OrderStatusTimeSeries[]> {
    try {
      const params = new URLSearchParams({
        action: 'time-series',
        ...(options.days && { days: options.days.toString() }),
        ...(options.startDate && { startDate: options.startDate }),
        ...(options.endDate && { endDate: options.endDate })
      });

      const endpoint = `?${params.toString()}`;
      
      const result = await this.apiRequest<{ data: OrderStatusTimeSeries[] }>(
        endpoint,
        requestOptions
      );
      return result.data || [];
    } catch (error) {
      console.error('Error fetching time-series data:', error);
      return [];
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    try {
      // ✅ SECURITY: Get session token for authorization
      const sessionToken = localStorage.getItem('session_token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      
      const response = await fetch(`${this.BASE_URL}?action=update-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId, status }),
      });

      // Handle 401 Unauthorized
      if (response.status === 401) {
        console.warn('[unifiedAdminClient] Unauthorized - session expired');
        localStorage.clear();
        window.location.href = '/auth';
        throw new Error('Session expired');
      }

      if (!response.ok) {
        throw new Error(`Failed to update order: ${response.statusText}`);
      }

      // Invalidate related caches
      this.invalidateOrdersCaches();

      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Batch request multiple endpoints
   */
  async batchRequest(requests: BatchRequest[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    // Execute requests in parallel (with reasonable concurrency limit)
    const chunks = this.chunkArray(requests, 5);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (req) => {
        try {
          const params = new URLSearchParams({
            action: req.endpoint,
            ...req.params
          });
          const data = await this.apiRequest(`?${params.toString()}`);
          return { id: req.id, data, error: null };
        } catch (error) {
          return { id: req.id, data: null, error };
        }
      });

      const chunkResults = await Promise.all(promises);
      
      chunkResults.forEach(({ id, data, error }) => {
        results[id] = { data, error };
      });
    }

    return results;
  }

  /**
   * Smart prefetch for admin dashboard
   */
  async prefetchDashboardData(): Promise<void> {
    const prefetchRequests = [
      { id: 'stats', endpoint: 'dashboard' },
      { id: 'recent-orders', endpoint: 'orders', params: { limit: '5' } },
      { id: 'notifications', endpoint: 'notifications', params: { limit: '5' } }
    ];

    // Execute prefetch in background
    this.batchRequest(prefetchRequests).catch(error => {
      console.warn('Prefetch failed:', error);
    });
  }

  /**
   * Clear specific cache patterns
   */
  invalidateOrdersCaches(): void {
    adminCache.invalidatePattern('admin:?action=orders');
    adminCache.invalidatePattern('admin:?action=dashboard'); // backward compat
    adminCache.invalidatePattern('admin:?action=dashboard-stats');
    adminCache.invalidatePattern('admin:?action=time-series');
  }

  invalidateUsersCaches(): void {
    adminCache.invalidatePattern('admin:?action=users');
    adminCache.invalidatePattern('admin:?action=dashboard'); // backward compat
    adminCache.invalidatePattern('admin:?action=dashboard-stats');
  }

  invalidateProductsCaches(): void {
    adminCache.invalidatePattern('admin:?action=products');
    adminCache.invalidatePattern('admin:?action=dashboard'); // backward compat
    adminCache.invalidatePattern('admin:?action=dashboard-stats');
  }

  /**
   * Get performance statistics
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Reset performance statistics
   */
  resetStats(): void {
    this.stats = {
      apiCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      totalBytes: 0,
    };
  }

  /**
   * Utility function to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Global instance
export const adminClient = new UnifiedAdminClient();

// Export for debugging in development
if (process.env.NODE_ENV === 'development') {
  (globalThis as any).adminClient = adminClient;
}

export default adminClient;
