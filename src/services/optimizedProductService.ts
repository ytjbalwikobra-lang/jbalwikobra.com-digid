// Optimized ProductService with pagination and caching
// Uses centralized globalCacheManager for consistent caching across the app
import { supabase } from './supabase';
import { Product, Tier, GameTitle } from '../types';
import { globalCache, cacheUtils } from './globalCacheManager';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProductFilters {
  search?: string;
  gameTitle?: string; // Filter by game_title_id (UUID)
  gameTitleSlug?: string; // Filter by game_titles.slug (for URL-based filtering)
  tier?: string; // Filter by tier_id (UUID)
  tierSlug?: string; // Filter by tiers.slug (for URL-based filtering)
  category?: string; // Filter by category_id (UUID)
  categorySlug?: string; // Filter by categories.slug (for URL-based filtering)
  status?: 'active' | 'archived' | 'all' | 'public';
  includeArchived?: boolean;
  hasRental?: boolean; // Server-side rental filter for egress optimization
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

// Cache tag constants for tag-based invalidation
const CACHE_TAGS = {
  PRODUCTS: 'opt-products',
  PRODUCTS_LIST: 'opt-products-list',
  GAME_TITLES: 'opt-game-titles',
  TIERS: 'opt-tiers',
};

class OptimizedProductService {
  private static getCacheKey(key: string, filters?: any): string {
    return cacheUtils.generateKey(`optimized:${key}`, filters || {});
  }

  /**
   * Get products with database-level pagination and filtering
   */
  static async getProductsPaginated(
    filters: ProductFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaginatedResponse<Product>> {
    const { page = 1, limit = 20 } = pagination;
    const { 
      search, gameTitle, gameTitleSlug, tier, tierSlug, 
      category, categorySlug, status = 'active', hasRental 
    } = filters;
    
    const cacheKey = this.getCacheKey('products_paginated', { filters, pagination });
    
    // Use globalCache.getOrSet for automatic cache management
    return globalCache.getOrSet<PaginatedResponse<Product>>(
      cacheKey,
      async () => {
        try {
          if (!supabase) throw new Error('Supabase not configured');

          // Build the query with proper filtering at database level
          let query = supabase
            .from('products')
            .select(`
              id, name, description, price, original_price,
              images, is_active, sold_channel, archived_at, created_at,
              game_title_id, tier_id, has_rental, category_id, stock,
              is_flash_sale, flash_sale_end_time,
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
            // Only truly active products (not sold, not archived)
            query = query.eq('is_active', true).is('archived_at', null).is('sold_channel', null);
          } else if (status === 'public') {
            // All non-archived products (including sold ones for public display)
            query = query.is('archived_at', null);
          } else if (status === 'archived') {
            query = query.or('is_active.eq.false,archived_at.not.is.null');
          }

          if (search && search.trim()) {
            query = query.or(`name.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
          }

          // Game filter - by ID or slug (slug uses relation filtering)
          if (gameTitle && gameTitle !== 'all') {
            query = query.eq('game_title_id', gameTitle);
          } else if (gameTitleSlug && gameTitleSlug !== 'all') {
            query = query.eq('game_titles.slug', gameTitleSlug);
          }

          // Tier filter - by ID or slug
          if (tier && tier !== 'all') {
            query = query.eq('tier_id', tier);
          } else if (tierSlug && tierSlug !== 'all') {
            query = query.eq('tiers.slug', tierSlug);
          }

          // Category filter - by ID or slug
          if (category && category !== 'all') {
            query = query.eq('category_id', category);
          } else if (categorySlug && categorySlug !== 'all') {
            query = query.eq('categories.slug', categorySlug);
          }

          // Server-side rental filter - reduces egress significantly
          if (hasRental === true) {
            query = query.eq('has_rental', true).is('sold_channel', null);
          }

          // Apply pagination at database level
          const offset = (page - 1) * limit;
          query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          const { data, error, count } = await query;

          if (error) throw error;

          return {
            data: (data || []).map(this.mapDatabaseProduct),
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
          };

        } catch (error) {
          console.error('Error fetching paginated products:', error);
          return {
            data: [],
            total: 0,
            page,
            limit,
            totalPages: 0
          };
        }
      },
      { ttl: cacheUtils.TTL.MEDIUM, tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCTS_LIST] }
    );
  }

  /**
   * Get products count by filters (for quick stats)
   */
  static async getProductsCount(filters: ProductFilters = {}): Promise<number> {
    const cacheKey = this.getCacheKey('products_count', filters);
    
    return globalCache.getOrSet<number>(
      cacheKey,
      async () => {
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

          return count || 0;

        } catch (error) {
          console.error('Error getting products count:', error);
          return 0;
        }
      },
      { ttl: cacheUtils.TTL.SHORT, tags: [CACHE_TAGS.PRODUCTS] }
    );
  }

  /**
   * Get game titles for filters (cached)
   */
  static async getGameTitles(): Promise<GameTitle[]> {
    const cacheKey = 'optimized:game_titles';
    
    return globalCache.getOrSet<GameTitle[]>(
      cacheKey,
      async () => {
        try {
          if (!supabase) return [];

          const { data, error } = await supabase
            .from('game_titles')
            .select('id, name, slug, icon, logo_url, is_active, color, is_popular')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

          if (error) throw error;

          return (data || []).map((item: any) => ({
            ...item,
            isActive: item.is_active,
            isPopular: item.is_popular ?? false,
            logoUrl: item.logo_url
          }));

        } catch (error) {
          console.error('Error fetching game titles:', error);
          return [];
        }
      },
      { ttl: cacheUtils.TTL.LONG, tags: [CACHE_TAGS.GAME_TITLES] }
    );
  }

  /**
   * Get tiers for filters (cached)
   */
  static async getTiers(): Promise<Tier[]> {
    const cacheKey = 'optimized:tiers';
    
    return globalCache.getOrSet<Tier[]>(
      cacheKey,
      async () => {
        try {
          if (!supabase) return [];

          const { data, error } = await supabase
            .from('tiers')
            .select('id, name, slug, description, color, border_color, background_gradient, icon, price_range_min, price_range_max, is_active, sort_order, created_at, updated_at')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

          if (error) throw error;

          return (data || []).map((item: any) => ({
            ...item,
            borderColor: item.border_color,
            backgroundGradient: item.background_gradient,
            priceRangeMin: item.price_range_min,
            priceRangeMax: item.price_range_max,
            isActive: item.is_active,
            sortOrder: item.sort_order,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          }));

        } catch (error) {
          console.error('Error fetching tiers:', error);
          return [];
        }
      },
      { ttl: cacheUtils.TTL.LONG, tags: [CACHE_TAGS.TIERS] }
    );
  }

  private static mapDatabaseProduct(product: any): Product {
    // Handle different formats: boolean true, string "true", number 1
    const rawHasRental = product.has_rental;
    const hasRentalValue = rawHasRental === true || rawHasRental === 'true' || rawHasRental === 1 || rawHasRental === '1';
    
    return {
      ...product,
      isActive: product.is_active ?? product.isActive,
      soldChannel: product.sold_channel ?? null,
      stock: product.stock ?? 0,
      archivedAt: product.archived_at ?? product.archivedAt,
      originalPrice: product.original_price ?? product.originalPrice,
      isFlashSale: product.is_flash_sale ?? product.isFlashSale ?? false,
      flashSaleEndTime: product.flash_sale_end_time ?? product.flashSaleEndTime,
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
      hasRental: hasRentalValue,
      rentalOptions: [] // Load separately if needed
    };
  }

  /**
   * Clear cache when products are modified
   */
  static clearProductsCache(): void {
    globalCache.invalidateByTags([CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCTS_LIST]);
  }

  /**
   * Invalidate all optimized product caches
   */
  static invalidateCache(): void {
    globalCache.invalidateByTags([
      CACHE_TAGS.PRODUCTS,
      CACHE_TAGS.PRODUCTS_LIST,
      CACHE_TAGS.GAME_TITLES,
      CACHE_TAGS.TIERS
    ]);
  }
}

export { OptimizedProductService };
export type { PaginatedResponse, ProductFilters, PaginationOptions };
