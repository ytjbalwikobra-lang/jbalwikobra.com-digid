// Optimized ProductService with pagination and caching
import { supabase } from './supabase';
import { deletePublicUrls } from './storageService';
import { Product, FlashSale, Tier, GameTitle } from '../types';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProductFilters {
  search?: string;
  gameTitle?: string;
  tier?: string;
  status?: 'active' | 'archived' | 'all';
  includeArchived?: boolean;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

// Cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

class OptimizedProductService {
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private static getCacheKey(key: string, filters?: any): string {
    return filters ? `${key}:${JSON.stringify(filters)}` : key;
  }

  private static getFromCache<T>(key: string): T | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    cache.delete(key);
    return null;
  }

  private static setCache<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  private static clearCachePattern(pattern: string): void {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  }

  /**
   * Get products with database-level pagination and filtering
   */
  static async getProductsPaginated(
    filters: ProductFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<Product>> {
    const { page = 1, limit = 20 } = pagination;
    const { search, gameTitle, tier, status = 'active' } = filters;
    
    const cacheKey = this.getCacheKey('products_paginated', { filters, pagination });
    const cached = this.getFromCache<PaginatedResponse<Product>>(cacheKey);
    if (cached) return cached;

    try {
      if (!supabase) throw new Error('Supabase not configured');

      // Build the query with proper filtering at database level
      let query = supabase
        .from('products')
        .select(`
          id, name, description, price, original_price,
          images, is_active, archived_at, created_at,
          game_title_id, tier_id, has_rental, category_id,
          tiers (
            id, name, slug, color, background_gradient, icon
          ),
          game_titles (
            id, name, slug, icon, logo_url
          ),
          categories:categories!fk_products_category (
            id, name, slug, icon, color, is_active, sort_order
          )
        `, { count: 'exact' });

      // Apply filters at database level
      if (status === 'active') {
        query = query.eq('is_active', true).is('archived_at', null);
      } else if (status === 'archived') {
        query = query.or('is_active.eq.false,archived_at.not.is.null');
      }

      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
      }

      if (gameTitle && gameTitle !== 'all') {
        query = query.eq('game_title_id', gameTitle);
      }

      if (tier && tier !== 'all') {
        query = query.eq('tier_id', tier);
      }

      // Apply pagination at database level
      const offset = (page - 1) * limit;
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const result: PaginatedResponse<Product> = {
        data: (data || []).map(this.mapDatabaseProduct),
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      };

      // Cache for 2 minutes for paginated results
      this.setCache(cacheKey, result, 2 * 60 * 1000);
      return result;

    } catch (error) {
      console.error('Error fetching paginated products:', error);
      // Fallback to empty result
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    }
  }

  /**
   * Get products count by filters (for quick stats)
   */
  static async getProductsCount(filters: ProductFilters = {}): Promise<number> {
    const cacheKey = this.getCacheKey('products_count', filters);
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) return cached;

    try {
      if (!supabase) return 0;

      let query = supabase
        .from('products')
        .select('id', { count: 'exact', head: true });

      const { status } = filters;
      if (status === 'active') {
        query = query.eq('is_active', true).is('archived_at', null);
      } else if (status === 'archived') {
        query = query.or('is_active.eq.false,archived_at.not.is.null');
      }

      const { count, error } = await query;
      if (error) throw error;

      const result = count || 0;
      this.setCache(cacheKey, result, 60 * 1000); // Cache for 1 minute
      return result;

    } catch (error) {
      console.error('Error getting products count:', error);
      return 0;
    }
  }

  /**
   * Get game titles for filters (cached)
   */
  static async getGameTitles(): Promise<GameTitle[]> {
    const cacheKey = 'game_titles';
    const cached = this.getFromCache<GameTitle[]>(cacheKey);
    if (cached) return cached;

    try {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('game_titles')
        .select('id, name, slug, icon, logo_url, is_active, color, is_popular')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const result = (data || []).map((item: any) => ({
        ...item,
        isActive: item.is_active,
        isPopular: item.is_popular ?? false,
        logoUrl: item.logo_url
      }));
      this.setCache(cacheKey, result, 10 * 60 * 1000); // Cache for 10 minutes
      return result;

    } catch (error) {
      console.error('Error fetching game titles:', error);
      return [];
    }
  }

  /**
   * Get tiers for filters (cached)
   */
  static async getTiers(): Promise<Tier[]> {
    const cacheKey = 'tiers';
    const cached = this.getFromCache<Tier[]>(cacheKey);
    if (cached) return cached;

    try {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from('tiers')
        .select('id, name, slug, description, color, border_color, background_gradient, icon, price_range_min, price_range_max, is_active, sort_order, created_at, updated_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const result = data || [];
      this.setCache(cacheKey, result, 10 * 60 * 1000); // Cache for 10 minutes
      return result;

    } catch (error) {
      console.error('Error fetching tiers:', error);
      return [];
    }
  }

  private static mapDatabaseProduct(product: any): Product {
    return {
      ...product,
      isActive: product.is_active ?? product.isActive,
      archivedAt: product.archived_at ?? product.archivedAt,
      originalPrice: product.original_price ?? product.originalPrice,
  // accountLevel removed
  // accountDetails removed (column dropped)
      tierData: product.tiers,
      gameTitleData: product.game_titles,
      categoryData: product.categories ? {
        id: product.categories.id,
        name: product.categories.name,
        slug: product.categories.slug,
        icon: product.categories.icon,
        color: product.categories.color,
        isActive: product.categories.is_active ?? true,
        sortOrder: product.categories.sort_order ?? 0,
      } : undefined,
      categoryId: product.category_id ?? product.categoryId ?? product.categories?.id,
      hasRental: product.has_rental ?? false,
      rentalOptions: [] // Load separately if needed
    };
  }

  /**
   * Clear cache when products are modified
   */
  static clearProductsCache(): void {
    this.clearCachePattern('products');
  }

  /**
   * Invalidate cache
   */
  static invalidateCache(): void {
    cache.clear();
  }
}

export { OptimizedProductService };
export type { PaginatedResponse, ProductFilters, PaginationOptions };
