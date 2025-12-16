/**
 * Enhanced Banner Service with iOS-compatible caching and data fetching
 * Ensures banners display actual data with iOS design system compatibility
 */

import { supabase } from './supabase';
import { globalCache } from './globalCacheManager';

// Banner interface matching Supabase schema
interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class EnhancedBannerService {
  private static instance: EnhancedBannerService;
  private static readonly CACHE_TAGS = {
    BANNERS: 'banners',
    ACTIVE_BANNERS: 'active-banners'
  } as const;

  static getInstance(): EnhancedBannerService {
    if (!this.instance) {
      this.instance = new EnhancedBannerService();
    }
    return this.instance;
  }

  /**
   * List all banners with iOS-optimized caching
   */
  async list(): Promise<Banner[]> {
    const cacheKey = 'banners:all';
    
    return globalCache.getOrSet(
      cacheKey,
      async () => {
        try {
          if (supabase) {
            const { data, error } = await supabase
              .from('banners')
              .select('id, title, subtitle, image_url, link_url, sort_order, is_active, created_at, updated_at')
              .order('sort_order', { ascending: true });

            if (error) {
              console.error('[BannerService] Database error:', error);
              // RLS issue hint removed in production
              
              // Return fallback data if RLS is blocking
              return this.getFallbackBanners();
            }

            // Removed verbose fetch count log
            
            if (!data || data.length === 0) {
              console.warn('[BannerService] No banners found, using fallback');
              return this.getFallbackBanners();
            }
            
            return data;
          }
          
          console.warn('[BannerService] Supabase not configured, using fallback');
          return this.getFallbackBanners();
        } catch (err) {
          console.error('[BannerService] Error fetching banners:', err);
          return this.getFallbackBanners();
        }
      },
      {
        ttl: 10 * 60 * 1000, // 10 minutes
        tags: [EnhancedBannerService.CACHE_TAGS.BANNERS]
      }
    );
  }

  /**
   * Get fallback banners when database is not accessible
   */
  private getFallbackBanners(): Banner[] {
    return [
      {
        id: 'fallback-1',
        title: 'TOP UP Game Termurah',
        subtitle: 'Proses kilat, harga terjangkau',
        image_url: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?w=1200',
        link_url: '/products',
        sort_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'fallback-2',
        title: 'Jual Akun Game Rare', 
        subtitle: 'Koleksi akun game terlengkap',
        image_url: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1200',
        link_url: '/accounts',
        sort_order: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  /**
   * Get only active banners with iOS optimization
   */
  async getActiveBanners(): Promise<Banner[]> {
    const cacheKey = 'banners:active';
    
    return globalCache.getOrSet(
      cacheKey,
      async () => {
        try {
          if (supabase) {
            const { data, error } = await supabase
              .from('banners')
              .select('id, title, subtitle, image_url, link_url, sort_order, is_active, created_at, updated_at')
              .eq('is_active', true)
              .order('sort_order', { ascending: true });

            if (error) {
              console.error('[BannerService] Database error:', error);
              // RLS issue hint removed in production
              
              // Return fallback data if RLS is blocking
              return this.getFallbackBanners().filter(b => b.is_active);
            }

            // Removed verbose active fetch count log
            
            if (!data || data.length === 0) {
              console.warn('[BannerService] No active banners found, using fallback');
              return this.getFallbackBanners().filter(b => b.is_active);
            }
            
            return data;
          }
          
          console.warn('[BannerService] Supabase not configured, using fallback');
          return this.getFallbackBanners().filter(b => b.is_active);
        } catch (err) {
          console.error('[BannerService] Error fetching active banners:', err);
          return this.getFallbackBanners().filter(b => b.is_active);
        }
      },
      {
        ttl: 10 * 60 * 1000, // 10 minutes
        tags: [EnhancedBannerService.CACHE_TAGS.ACTIVE_BANNERS]
      }
    );
  }

  /**
   * Create a new banner
   */
  async create(bannerData: Omit<Banner, 'id' | 'created_at' | 'updated_at'>): Promise<Banner> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('banners')
      .insert([bannerData])
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create banner');

    await this.invalidateCache();
    return data;
  }

  /**
   * Update an existing banner
   */
  async update(id: string, updates: Partial<Banner>): Promise<Banner> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('banners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Banner not found');

    await this.invalidateCache();
    return data;
  }

  /**
   * Delete a banner
   */
  async delete(id: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await this.invalidateCache();
  }

  /**
   * Invalidate all banner-related caches
   */
  private async invalidateCache(): Promise<void> {
    await globalCache.invalidateByTags([
      EnhancedBannerService.CACHE_TAGS.BANNERS,
      EnhancedBannerService.CACHE_TAGS.ACTIVE_BANNERS
    ]);
  }
}

// Export singleton instance
export const enhancedBannerService = EnhancedBannerService.getInstance();

// Export type and interface
export type { Banner };
