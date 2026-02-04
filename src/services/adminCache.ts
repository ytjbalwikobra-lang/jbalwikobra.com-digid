/**
 * Enhanced Admin Cache Manager
 * Reduces API calls and minimizes cache egress usage with advanced features
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  totalSize: number;
  hitRate: number;
  oldestEntry: number;
  newestEntry: number;
}

class EnhancedAdminCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
  };

  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of entries
  private readonly STATS_TTL = 2 * 60 * 1000; // 2 minutes for stats (more frequent updates)
  private readonly LIST_TTL = 3 * 60 * 1000; // 3 minutes for lists

  // Cache keys with strategic TTL
  private readonly CACHE_CONFIG = {
    'admin:stats': this.STATS_TTL,
    'admin:orders': this.LIST_TTL,
    'admin:users': this.LIST_TTL,
    'admin:products': this.LIST_TTL,
    'admin:reviews': this.LIST_TTL,
    'admin:banners': this.LIST_TTL * 2, // Banners change less frequently
    'admin:flash-sales': this.LIST_TTL,
    'admin:feed-posts': this.LIST_TTL,
    'admin:notifications': 30 * 1000, // 30 seconds for real-time notifications
    'admin:time-series': this.LIST_TTL,
  };

  /**
   * Get cached data (standard get without fetch fallback)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    
    return entry.data;
  }

  /**
   * Get stale data (even if expired) - useful for fallback scenarios
   */
  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Update access stats but don't count as regular hit
    entry.hits++;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entryTtl = ttl || this.CACHE_CONFIG[key as keyof typeof this.CACHE_CONFIG] || this.DEFAULT_TTL;
    
    // Evict entries if we're at capacity
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.evictLeastUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: entryTtl,
      hits: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.stats.sets++;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return (Date.now() - entry.timestamp) > entry.ttl;
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Get cached data or fetch if not available/expired
   */
  async getOrFetch<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options?: { ttl?: number; forceRefresh?: boolean }
  ): Promise<T> {
    const cacheKey = key;
    const ttl = options?.ttl || this.CACHE_CONFIG[key as keyof typeof this.CACHE_CONFIG] || this.DEFAULT_TTL;

    // Force refresh if requested
    if (options?.forceRefresh) {
      this.invalidate(cacheKey);
    }

    // Check if we have valid cached data using the new get method
    const cachedData = this.get<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Fetch fresh data
    try {
      const data = await fetchFunction();
      
      // Store in cache using new set method
      this.set(cacheKey, data, ttl);

      return data;
    } catch (error) {
      // If fetch fails and we have stale data, return it
      const staleData = this.getStale<T>(cacheKey);
      if (staleData) {
        return staleData;
      }
      throw error;
    }
  }

  /**
   * Prefetch data to warm cache
   */
  async prefetch<T>(key: string, fetchFunction: () => Promise<T>): Promise<void> {
    try {
      await this.getOrFetch(key, fetchFunction);
    } catch (error) {
      console.warn(`Failed to prefetch ${key}:`, error);
    }
  }

  /**
   * Batch prefetch multiple cache entries
   */
  async prefetchBatch(entries: Array<{ key: string; fetchFn: () => Promise<any> }>): Promise<void> {
    const promises = entries.map(({ key, fetchFn }) => this.prefetch(key, fetchFn));
    await Promise.allSettled(promises);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate multiple entries by pattern
   */
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
    keys.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get enhanced cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      size: JSON.stringify(entry.data).length,
      hits: entry.hits,
      lastAccessed: entry.lastAccessed
    }));

    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    const timestamps = entries.map(e => e.lastAccessed).filter(t => t > 0);
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      totalSize,
      hitRate,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Smart cache strategy: prefetch related data
   */
  async smartPrefetch(currentPage: string): Promise<void> {
    const prefetchMap: Record<string, string[]> = {
      'dashboard': ['admin:stats', 'admin:notifications'],
      'orders': ['admin:orders', 'admin:stats'],
      'users': ['admin:users'],
      'products': ['admin:products'],
      'reviews': ['admin:reviews'],
      'banners': ['admin:banners'],
      'flash-sales': ['admin:flash-sales'],
      'feed': ['admin:feed-posts']
    };

    // This would be implemented by the component using this cache
    // by calling the appropriate fetch functions
    void prefetchMap[currentPage];
  }
}

// Global instance
export const adminCache = new EnhancedAdminCacheManager();

// Cleanup interval
setInterval(() => {
  adminCache.cleanup();
}, 5 * 60 * 1000); // Cleanup every 5 minutes

export default adminCache;
